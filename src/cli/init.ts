/**
 * smoz init
 *
 * Scaffolds a new project from packaged templates.
 * - Copies ./templates/project/ into the target root (shared boilerplate)
 * - Copies ./templates/<template>/ into the target root (default: minimal)
 * - Seeds app/generated/register.*.ts (empty modules) if missing
 * - Idempotent: copy-if-absent; if a file exists, writes <name>.example alongside
 * - Additive merge of template manifest (deps/devDeps/scripts) into package.json
 * - Optional dependency installation via --install[=<pm>]
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';

import { packageDirectorySync } from 'package-directory';

const toPosix = (p: string): string => p.split(sep).join('/');

const writeIfAbsent = async (
  outFile: string,
  content: string,
): Promise<{ created: boolean }> => {
  if (existsSync(outFile)) return { created: false };
  await fs.mkdir(dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, content, 'utf8');
  return { created: true };
};
const walk = async (dir: string, out: string[] = []): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      await walk(p, out);
    } else if (ent.isFile()) {
      out.push(p);
    }
  }
  return out;
};

const resolveTemplatesBase = (): string => {
  // Resolve the package root (works both in dev and when installed)
  const pkgRoot = packageDirectorySync() ?? process.cwd();
  return resolve(pkgRoot, 'templates');
};

const readJson = async <T = unknown>(file: string): Promise<T | undefined> => {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data) as T;
  } catch {
    return undefined;
  }
};

const writeJson = async (file: string, obj: unknown): Promise<void> => {
  await fs.mkdir(dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(obj, null, 2), 'utf8');
};

const detectPm = (root: string): 'pnpm' | 'yarn' | 'npm' | 'bun' | undefined => {
  if (existsSync(join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(root, 'package-lock.json'))) return 'npm';
  if (existsSync(join(root, 'bun.lockb'))) return 'bun';
  const ua = process.env.npm_config_user_agent ?? '';
  if (ua.includes('pnpm')) return 'pnpm';
  if (ua.includes('yarn')) return 'yarn';
  if (ua.includes('bun')) return 'bun';
  if (ua.includes('npm')) return 'npm';
  return undefined;
};

const runInstall = (
  root: string,
  pm?: string,
): 'ran (npm)' | 'ran (pnpm)' | 'ran (yarn)' | 'ran (bun)' | 'skipped' | 'unknown-pm' | 'failed' => {
  if (!pm) return 'skipped';
  const known = pm === 'pnpm' || pm === 'yarn' || pm === 'bun' || pm === 'npm';
  if (!known) return 'unknown-pm';

  // Spawn with explicit args; avoid tuple inference that widens types.
  const res = spawnSync(pm, ['install'], {
    stdio: 'inherit',
    cwd: root,
    shell: true,
  });

  if (res.status === 0) {
    const tag: 'ran (pnpm)' | 'ran (yarn)' | 'ran (bun)' | 'ran (npm)' =
      pm === 'pnpm' ? 'ran (pnpm)' : pm === 'yarn' ? 'ran (yarn)' : pm === 'bun' ? 'ran (bun)' : 'ran (npm)';
    return tag;
  }
  return 'failed';
};

const mergeAdditive = (target: Record<string, unknown>, source: Record<string, unknown>) => {
  const merged: string[] = [];
  const mergeKey = (key: 'dependencies' | 'devDependencies' | 'peerDependencies') => {
    // Allow possibly-undefined shapes to satisfy lint (no-unnecessary-condition).
    const src = (source[key] as Record<string, string> | undefined) ?? {};
    const dst = (target[key] as Record<string, string> | undefined) ?? {};
    const out = { ...dst };
    for (const [k, v] of Object.entries(src)) {
      if (!(k in dst)) {
        out[k] = v;
        merged.push(`${key}:${k}@${v}`);
      }
    }
    if (Object.keys(out).length) (target[key] as Record<string, string>) = out;
  };
  mergeKey('dependencies');
  mergeKey('devDependencies');
  mergeKey('peerDependencies');
  const srcScripts = (source.scripts as Record<string, string> | undefined) ?? {};
  const dstScripts = (target.scripts as Record<string, string> | undefined) ?? {};
  const scriptsOut = { ...dstScripts };
  for (const [name, script] of Object.entries(srcScripts)) {
    if (!(name in dstScripts)) {
      scriptsOut[name] = script;
      merged.push(`scripts:${name}`);    } else if (dstScripts[name] !== script) {
      const alias = `${name}:smoz`;
      if (!(alias in dstScripts)) {
        scriptsOut[alias] = script;
        merged.push(`scripts:${alias}`);
      }
    }
  }
  (target.scripts as Record<string, string>) = scriptsOut;
  return merged;
};

const copyDirIdempotent = async (
  srcDir: string,
  dstRoot: string,
  created: string[],
  skipped: string[],
  examples: string[],
) => {
  const files = await walk(srcDir);
  for (const abs of files) {
    const rel = relative(srcDir, abs);
    const dest = resolve(dstRoot, rel);
    const data = await fs.readFile(abs, 'utf8');
    if (existsSync(dest)) {
      const ex = `${dest}.example`;
      if (!existsSync(ex)) {
        await writeIfAbsent(ex, data);
        examples.push(posix.normalize(ex));
      } else {
        skipped.push(posix.normalize(dest));
      }
    } else {
      const { created: c } = await writeIfAbsent(dest, data);
      if (c) created.push(posix.normalize(dest));
      else skipped.push(posix.normalize(dest));
    }
  }
};

export const runInit = async (
  root: string,
  template = 'minimal',
  opts?: {
    init?: boolean;
    install?: string | boolean;
    yes?: boolean;
    dryRun?: boolean;
  },
): Promise<{
  created: string[];
  skipped: string[];
  examples: string[];
  merged: string[];
  installed: string;
}> => {
  const created: string[] = [];
  const skipped: string[] = [];
  const examples: string[] = [];
  const merged: string[] = [];

  const templatesBase = resolveTemplatesBase();
  const srcBase = resolve(templatesBase, template);
  const projectBase = resolve(templatesBase, 'project');
  if (!existsSync(srcBase)) {    throw new Error(
      `Template "${template}" not found under ${toPosix(templatesBase)}.`,
    );
  }

  // 1) Copy shared boilerplate (project) first (idempotent)
  if (existsSync(projectBase)) {
    await copyDirIdempotent(projectBase, root, created, skipped, examples);
  }
  // 2) Copy selected template
  await copyDirIdempotent(srcBase, root, created, skipped, examples);

  // Seed app/generated/register.*.ts (empty modules) if missing
  const genDir = resolve(root, 'app', 'generated');
  const seeds: Array<{ path: string; content: string }> = [
    {
      path: join(genDir, 'register.functions.ts'),
      content: `/* AUTO-GENERATED placeholder; will be rewritten by \`smoz register\` */\nexport {};\n`,
    },
    {
      path: join(genDir, 'register.openapi.ts'),
      content: `/* AUTO-GENERATED placeholder; will be rewritten by \`smoz register\` */\nexport {};\n`,
    },
    {
      path: join(genDir, 'register.serverless.ts'),
      content: `/* AUTO-GENERATED placeholder; will be rewritten by \`smoz register\` */\nexport {};\n`,
    },
  ];
  for (const s of seeds) {
    const { created: c } = await writeIfAbsent(s.path, s.content);
    if (c) created.push(posix.normalize(s.path));
    else skipped.push(posix.normalize(s.path));
  }

  // 3) package.json presence (guard or create with --init)
  const pkgPath = join(root, 'package.json');
  let pkg = await readJson<Record<string, unknown>>(pkgPath);
  if (!pkg) {
    const shouldInit = !!(opts && opts.init);
    if (shouldInit) {
      const name = toPosix(root).split('/').pop() ?? 'smoz-app';
      pkg = { name, private: true, type: 'module', version: '0.0.0', scripts: {} };
      // Avoid optional chain to satisfy no-unnecessary-condition; normalize to boolean.
      const dryRunCreate = !!(opts && opts.dryRun);
      if (!dryRunCreate) await writeJson(pkgPath, pkg);
      created.push(posix.normalize(pkgPath));
    } else {
      throw new Error(        'No package.json found. Run "npm init -y" (or re-run with --init) and then "smoz init" again.',
      );
    }
  }
  // 4) Merge manifest (deps/devDeps/scripts) additively
  const manifestPath = resolve(templatesBase, '.manifests', `package.${template}.json`);
  const manifest = await readJson<Record<string, unknown>>(manifestPath);
  if (manifest) {
    const before = JSON.stringify(pkg);
    const added = mergeAdditive(pkg, manifest);
    merged.push(...added);
    const dryRun = !!(opts && opts.dryRun);
    if (!dryRun && before !== JSON.stringify(pkg)) {
      await writeJson(pkgPath, pkg);
    }
  }

  // 5) Optional install
  let installed: 'skipped' | 'ran (npm)' | 'ran (pnpm)' | 'ran (yarn)' | 'ran (bun)' | 'unknown-pm' | 'failed' = 'skipped';
  const installOpt = opts ? opts.install : false;
  const wantsInstall =
    (typeof installOpt === 'string' && installOpt.length > 0) ||
    installOpt === true;
  if (wantsInstall) {
    const pm: string | undefined =
      typeof installOpt === 'string' && installOpt.length > 0
        ? installOpt
        : detectPm(root);
    installed = runInstall(root, pm);
  }

  return { created, skipped, examples, merged, installed };
};