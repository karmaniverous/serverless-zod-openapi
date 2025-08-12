import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { createRequire } from 'module';
import path from 'path';

type RunResult = { code: number; stdout: string; stderr: string };

const run = async (
  cmd: string,
  args: string[],
  cwd: string,
  useShell: boolean,
): Promise<RunResult> =>
  new Promise<RunResult>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: useShell,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString('utf8');
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString('utf8');
    });
    child.on('error', (err: Error) => {
      reject(err);
    });
    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });

type VitestAssertion = {
  name?: string;
  status?: 'pass' | 'fail' | 'skip' | 'todo';
  error?: { message?: string; stack?: string };
};

type VitestTask = {
  name?: string;
  file?: string;
  result?: { state?: 'pass' | 'fail' | 'skip' | 'todo' };
  tasks?: VitestTask[];
  errors?: Array<{ message?: string; stack?: string }>;
  assertions?: VitestAssertion[];
};

type VitestJson = {
  success?: boolean;
  tests?: VitestTask[];
  testResults?: VitestTask[];
};

const flattenFailures = (
  root: VitestTask[],
): Array<{ file: string; name: string; message: string; stack: string }> => {
  const out: Array<{
    file: string;
    name: string;
    message: string;
    stack: string;
  }> = [];
  const walk = (t: VitestTask, parentFile: string): void => {
    const file = t.file ?? parentFile;
    const state = t.result?.state;
    if (state === 'fail') {
      for (const e of t.errors ?? []) {
        out.push({
          file,
          name: t.name ?? '(unnamed test)',
          message: e.message ?? '',
          stack: e.stack ?? '',
        });
      }
      for (const a of t.assertions ?? []) {
        if (a.status === 'fail') {
          out.push({
            file,
            name: a.name ?? '(unnamed assertion)',
            message: a.error?.message ?? '',
            stack: a.error?.stack ?? '',
          });
        }
      }
    }
    for (const child of t.tasks ?? []) walk(child, file);
  };
  for (const t of root) walk(t, t.file ?? '');
  return out;
};

const resolveVitestBin = async (
  cwd: string,
): Promise<{ cmd: string; args: string[]; shell: boolean } | null> => {
  // Prefer executing Vitest’s JS bin with Node (cross-platform, avoids .cmd shims)
  try {
    const require = createRequire(import.meta.url);
    const pkgPath = require.resolve('vitest/package.json', { paths: [cwd] });
    const pkgJson = JSON.parse(await readFile(pkgPath, 'utf8')) as {
      bin?: string | Record<string, string>;
    };
    const binRel =
      typeof pkgJson.bin === 'string' ? pkgJson.bin : pkgJson.bin?.vitest;
    if (binRel) {
      const binAbs = path.join(path.dirname(pkgPath), binRel);
      return {
        cmd: process.execPath,
        args: [binAbs, 'run', '--reporter=json'],
        shell: false,
      };
    }
  } catch (err) {
    // fall through
  }

  // Fallback to local .bin shim if it exists
  const binName = process.platform.startsWith('win') ? 'vitest.cmd' : 'vitest';
  const localBin = path.join(cwd, 'node_modules', '.bin', binName);
  if (existsSync(localBin)) {
    const shell = process.platform.startsWith('win'); // .cmd prefers shell on Windows
    return { cmd: localBin, args: ['run', '--reporter=json'], shell };
  }

  // Last resort: npx
  return {
    cmd: 'npx',
    args: ['-y', 'vitest', 'run', '--reporter=json'],
    shell: true,
  };
};

const runVitest = async (
  cwd: string,
  reporter: 'json' | 'basic',
): Promise<RunResult> => {
  const resolved = await resolveVitestBin(cwd);
  if (!resolved) return { code: 1, stdout: '', stderr: 'vitest-not-found' };
  const args = [...resolved.args];
  if (reporter === 'basic') {
    // swap reporter arg
    const idx = args.findIndex(
      (a) => a.startsWith('--reporter=') || a === '--reporter',
    );
    if (idx >= 0) {
      if (args[idx] === '--reporter' && args[idx + 1]) args[idx + 1] = 'basic';
      else args[idx] = '--reporter=basic';
    } else {
      args.push('--reporter=basic');
    }
  }
  return run(resolved.cmd, args, cwd, resolved.shell);
};

const main = async (): Promise<void> => {
  const repoRoot = process.cwd();
  const outDirAbs = path.join(repoRoot, 'context/out');
  await mkdir(outDirAbs, { recursive: true });

  const outJsonAbs = path.join(repoRoot, 'context/out/test.json');

  try {
    // Try JSON reporter
    const jsonRun = await runVitest(repoRoot, 'json');

    // Parse JSON if possible
    try {
      const parsed = JSON.parse(jsonRun.stdout) as VitestJson;
      const tasks = parsed.tests ?? parsed.testResults ?? [];
      const fails = flattenFailures(tasks);

      const jsonOut = {
        success: jsonRun.code === 0,
        failed: fails.length,
        failures: fails,
        rawReporter: parsed,
        runnerStderr: jsonRun.stderr ? jsonRun.stderr : undefined,
      };

      await writeFile(
        outJsonAbs,
        `${JSON.stringify(jsonOut, null, 2)}\n`,
        'utf8',
      );
      console.log(
        `test: wrote context/out/test.json (exit: ${jsonRun.code.toString()}, failed: ${fails.length.toString()})`,
      );
      process.exitCode = jsonRun.code;
      return;
    } catch (err) {
      // Fall back to basic reporter if JSON stdout wasn't parseable
      const basic = await runVitest(repoRoot, 'basic');
      const jsonOut = {
        success: basic.code === 0,
        failed: basic.code === 0 ? 0 : undefined,
        raw: `${basic.stdout}${basic.stderr}`,
        note: 'json reporter not available; using basic reporter output',
        previousRun: { code: jsonRun.code, stderr: jsonRun.stderr },
      };
      await writeFile(
        outJsonAbs,
        `${JSON.stringify(jsonOut, null, 2)}\n`,
        'utf8',
      );
      console.log(
        `test: wrote context/out/test.json (exit: ${basic.code.toString()}, reporter: basic)`,
      );
      process.exitCode = basic.code;
    }
  } catch (err) {
    const jsonOut = {
      success: false,
      error: 'vitest-not-found-or-failed-to-run',
      hint: 'Ensure vitest is installed as a devDependency.',
    };
    await writeFile(
      outJsonAbs,
      `${JSON.stringify(jsonOut, null, 2)}\n`,
      'utf8',
    );
    console.log('test: wrote context/out/test.json (runner error)');
    process.exitCode = 1;
  }
};

void main();
