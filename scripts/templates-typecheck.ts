// templates:typecheck
// Discover template tsconfig.json files under templates/* and run
// "tsc -p --noEmit" for each. Fail fast with a readable template name on error.
// Emits both stdout and stderr on failure (to stdout) for complete diagnostics.
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
const repoRoot = process.cwd();
const templatesDir = path.join(repoRoot, 'templates');
const isDir = (p: string) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

const findTemplateConfigs = (): Array<{ name: string; tsconfig: string }> => {
  if (!existsSync(templatesDir)) return [];
  const entries = readdirSync(templatesDir);
  const out: Array<{ name: string; tsconfig: string }> = [];
  for (const name of entries) {
    // skip project and .check — only real templates should be listed
    if (name === 'project' || name === '.check' || name.startsWith('.'))
      continue;
    const dir = path.join(templatesDir, name);
    if (!isDir(dir)) continue;
    const tsconfig = path.join(dir, 'tsconfig.json');
    if (existsSync(tsconfig)) out.push({ name, tsconfig });
  }
  return out;
};

const run = () => {
  const targets = findTemplateConfigs();
  if (targets.length === 0) {
    console.log('No template tsconfig.json files found under templates/*.');
    return;
  }
  for (const t of targets) {
    console.log(`Typechecking template: ${t.name}`);
    // Prefer Node + local tsc.js to avoid .cmd shims and EINVAL on Windows.
    // Create a temporary tsconfig that injects path mapping for '@karmaniverous/smoz'
    // so template code can resolve toolkit types without publishing artifacts.
    let tmpConfig = t.tsconfig;
    try {
      const raw = readFileSync(t.tsconfig, 'utf8');
      const cfg = JSON.parse(raw) as Record<string, unknown>;
      const co = (cfg.compilerOptions ??= {} as Record<string, unknown>);
      const paths = (co['paths'] ??= {} as Record<string, string[]>);
      const mapping: string[] = Array.isArray(
        (paths as Record<string, unknown>)['@karmaniverous/smoz'],
      )
        ? ((paths as Record<string, string[]>)[
            '@karmaniverous/smoz'
          ] as string[])
        : ['../../.stan/dist/index.d.ts', '../../dist/index.d.ts'];
      (paths as Record<string, string[]>)['@karmaniverous/smoz'] = mapping;
      tmpConfig = path.join(
        path.dirname(t.tsconfig),
        'tsconfig.__smoz.tmp.json',
      );
      writeFileSync(tmpConfig, JSON.stringify(cfg, null, 2), 'utf8');
    } catch {
      // Fall back to original config if we cannot read/parse/write
      tmpConfig = t.tsconfig;
    }

    // Resolve local TypeScript binary
    const tscJs = path.join(
      repoRoot,
      'node_modules',
      'typescript',
      'lib',
      'tsc.js',
    );
    const tscBin = path.join(
      repoRoot,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
    );
    let cmd: string;
    let args: string[];
    let useShell = false;
    if (existsSync(tscJs)) {
      // node <repo>/node_modules/typescript/lib/tsc.js ...
      cmd = process.execPath;
      args = [tscJs, '-p', tmpConfig, '--noEmit', '--pretty', 'false'];
    } else {
      if (existsSync(tscBin)) {
        cmd = tscBin;
        args = ['-p', tmpConfig, '--noEmit', '--pretty', 'false'];
        // Some Windows shells require shell:true when invoking .cmd directly.
        useShell = process.platform === 'win32';
      } else {
        cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        args = ['tsc', '-p', tmpConfig, '--noEmit', '--pretty', 'false'];
        useShell = process.platform === 'win32'; // robust .cmd resolution
      }
    } // Capture both stdout and stderr so we can print them on failure to stdout,
    // ensuring downstream log collectors (that may ignore stderr) still see diagnostics.
    const res = spawnSync(cmd, args, {
      cwd: repoRoot,
      shell: useShell,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    // Convert stdout/stderr safely across platforms (string | Buffer | undefined).
    const toText = (x: unknown): string => {
      if (typeof x === 'string') return x;
      if (x && typeof x === 'object' && Buffer.isBuffer(x)) {
        return x.toString('utf8');
      }
      return '';
    };
    const out = toText(res.stdout).trim();
    const err = toText(res.stderr).trim();
    // On failure: print a clear header, the full stdout/stderr, and exit.
    if (res.status !== 0) {
      console.log(`Typecheck failed for template: ${t.name}`);
      if (res.error) {
        console.log('--- spawn error ---');
        console.log(String(res.error));
        if (!existsSync(tscJs) && !existsSync(tscBin)) {
          console.log(
            'Note: local TypeScript binary not found. Ensure dev deps are installed (e.g., "npm i") or add TypeScript to devDependencies.',
          );
        }
      }
      if (out.length) {
        console.log('--- tsc stdout ---');
        console.log(out);
      }
      if (err.length) {
        console.log('--- tsc stderr ---');
        console.log(err);
      }
      // Also print the invoked command to help local reproduction.
      console.log(`--- invoked ---`);
      console.log([cmd, ...args].join(' '));
      process.exit(res.status ?? 1);
    }
    // Clean up temporary config if we wrote one
    if (tmpConfig !== t.tsconfig) {
      try {
        unlinkSync(tmpConfig);
      } catch {
        /* noop */
      }
    }

    // Optional: surface non-empty stdout in success cases to aid debugging
    // without overwhelming logs (tsc is generally quiet on success).
    if (out.length) {
      console.log(out);
    }
  }
  console.log('All templates typecheck OK.');
};

run();
