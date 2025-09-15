import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { packageDirectorySync } from 'package-directory';

export const resolveTsxCommand = (
  root: string,
  tsEntry: string,
): { cmd: string; args: string[]; shell: boolean } => {
  const localCli = path.resolve(root, 'node_modules', 'tsx', 'dist', 'cli.js');
  if (fs.existsSync(localCli)) {
    // Normalize to POSIX separators for cross-platform comparisons (tests)
    const localCliPosix = localCli.split(path.sep).join('/');
    return {
      cmd: process.execPath,
      args: [localCliPosix, tsEntry],
      shell: false,
    };
  }
  const probe = spawnSync(
    process.platform === 'win32' ? 'tsx.cmd' : 'tsx',
    ['--version'],
    { shell: true },
  );
  if (typeof probe.status === 'number' && probe.status === 0) {
    return {
      cmd: process.platform === 'win32' ? 'tsx.cmd' : 'tsx',
      args: [tsEntry],
      shell: true,
    };
  }
  throw new Error(
    'Inline requires tsx. Install it with "npm i -D tsx", or run "smoz dev -l offline".',
  );
};

export const launchInline = async (
  root: string,
  opts: { stage: string; port: number; verbose: boolean },
) => {
  // Resolve the installed smoz package root robustly (works from compiled CLI and tsx ESM):
  // Prefer __dirname when available (CJS), otherwise derive from import.meta.url (ESM).
  const here =
    typeof __dirname === 'string'
      ? __dirname
      : path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = packageDirectorySync({ cwd: here }) ?? process.cwd();
  const tsEntry = path.resolve(
    pkgRoot,
    'src',
    'cli',
    'local',
    'inline.server',
    'index.ts',
  );

  const makeTsx = () => {
    const { cmd, args, shell } = resolveTsxCommand(root, tsEntry);
    return spawn(cmd, args, {
      cwd: root,
      stdio: 'inherit',
      shell,
      // Enable tsconfig paths for "@/..." during TS fallback.
      env: {
        ...process.env,
        TSX_TSCONFIG_PATHS: '1',
        SMOZ_STAGE: opts.stage,
        SMOZ_PORT: String(opts.port),
        SMOZ_VERBOSE: opts.verbose ? '1' : '',
      },
    });
  };

  let child = makeTsx();
  const close = async () =>
    new Promise<void>((resolve) => {
      // If the process has already exited (exitCode set), resolve immediately.
      if (child.exitCode !== null) {
        resolve();
        return;
      }
      child.once('exit', () => {
        resolve();
      });
      child.kill('SIGTERM');
      setTimeout(() => {
        resolve();
      }, 1500);
    });
  const restart = async () => {
    await close();
    child = makeTsx();
  };
  return { close, restart };
};
