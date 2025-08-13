import { spawn } from 'child_process';
import { ESLint } from 'eslint';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

type RunResult = { code: number; stdout: string; stderr: string };

const run = async (
  cmd: string,
  args: string[],
  cwd: string,
): Promise<RunResult> =>
  new Promise<RunResult>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
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

const main = async (): Promise<void> => {
  const root = await run(
    'git',
    ['rev-parse', '--show-toplevel'],
    process.cwd(),
  );
  const repoRoot = root.code === 0 ? root.stdout.trim() : process.cwd();

  const outDirAbs = path.join(repoRoot, 'tools/context/out');
  await mkdir(outDirAbs, { recursive: true });

  const outJsonAbs = path.join(repoRoot, 'tools/context/out/lint.json');

  try {
    const eslint = new ESLint({ cwd: repoRoot });
    const results = await eslint.lintFiles(['.']);

    const errorTotal = results.reduce((n, r) => n + r.errorCount, 0);
    const warningTotal = results.reduce((n, r) => n + r.warningCount, 0);
    const withIssues = results.filter(
      (r) => r.errorCount > 0 || r.warningCount > 0,
    );

    const payload = {
      summary: {
        errors: errorTotal,
        warnings: warningTotal,
        filesWithIssues: withIssues.length,
      },
      results: withIssues,
    } satisfies {
      summary: { errors: number; warnings: number; filesWithIssues: number };
      results: ESLint.LintResult[];
    };

    await writeFile(
      outJsonAbs,
      `${JSON.stringify(payload, null, 2)}\n`,
      'utf8',
    );

    if (errorTotal > 0) process.exitCode = 1;
    console.log(
      `lint: wrote tools/context/out/lint.json (errors: ${errorTotal.toString()}, warnings: ${warningTotal.toString()})`,
    );
  } catch {
    const errJson = {
      summary: { errors: -1, warnings: 0, filesWithIssues: 0 },
      error: 'lint-runner-failed',
    };
    await writeFile(
      outJsonAbs,
      `${JSON.stringify(errJson, null, 2)}\n`,
      'utf8',
    );
    process.exitCode = 1;
    console.log('lint: wrote tools/context/out/lint.json (runner failed)');
  }
};

void main();
