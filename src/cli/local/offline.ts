/**
 * serverless-offline runner (dev-only).
 *
 * - Provides sane TMP/TEMP/TMPDIR fallbacks to avoid "undefined\\temp\\..." paths.
 * - Spawns the local Serverless CLI to run "offline start".
 * - Provides restart/close helpers for the dev orchestrator.
 * - Avoids unnecessary nullish-coalescing so ESLint doesn't flag conditions.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type OfflineRunner = {
  restart: () => Promise<void>;
  close: () => Promise<void>;
};

type LaunchOpts = {
  stage: string;
  port: number;
  verbose: boolean;
};

export const launchOffline = async (
  root: string,
  opts: LaunchOpts,
): Promise<OfflineRunner> => {
  const slsJs = path.resolve(
    root,
    'node_modules',
    'serverless',
    'bin',
    'serverless.js',
  );

  const makeCmd = () => {
    const args: string[] = [];
    let cmd: string;
    let shell = false;
    if (fs.existsSync(slsJs)) {
      cmd = process.execPath;
      args.push(
        slsJs,
        'offline',
        'start',
        '--stage',
        opts.stage,
        '--httpPort',
        String(typeof opts.port === 'number' ? opts.port : 0),
      );
    } else {
      // Fallback to PATH
      cmd = process.platform === 'win32' ? 'serverless.cmd' : 'serverless';
      args.push(
        'offline',
        'start',
        '--stage',
        opts.stage,
        '--httpPort',
        String(typeof opts.port === 'number' ? opts.port : 0),
      );
      shell = true;
    }
    return { cmd, args, shell };
  };

  let child = spawnOffline(root, makeCmd(), opts.verbose);

  const close = async (): Promise<void> =>
    new Promise<void>((resolve) => {
      if (child.killed) {
        resolve();
        return;
      }
      child.once('exit', () => {
        resolve();
      });
      child.kill('SIGTERM');
      // Safety timeout
      setTimeout(() => {
        resolve();
      }, 1500);
    });

  const restart = async (): Promise<void> => {
    await close();
    child = spawnOffline(root, makeCmd(), opts.verbose);
  };

  return { restart, close };
};

const spawnOffline = (
  root: string,
  cmd: { cmd: string; args: string[]; shell: boolean },
  verbose: boolean,
) => {
  // Inherit the parent env, but ensure temp variables are present.
  // Some toolchains (e.g., tsx/esbuild invoked under offline) interpolate TEMP/TMP,
  // and if they are undefined, they may create literal "undefined\\temp\\..." paths
  // relative to CWD. Use os.tmpdir() as a safe fallback.
  const baseEnv: NodeJS.ProcessEnv = { ...process.env };
  const tmp = os.tmpdir();
  // Cross-platform default
  if (!baseEnv.TMPDIR) baseEnv.TMPDIR = tmp;
  // Windows defaults
  if (process.platform === 'win32') {
    if (!baseEnv.TEMP) baseEnv.TEMP = tmp;
    if (!baseEnv.TMP) baseEnv.TMP = tmp;
  }

  const child = spawn(cmd.cmd, cmd.args, {
    cwd: root,
    shell: cmd.shell,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: baseEnv,
  });

  const prefix = '[offline] ';
  const emit = (buf: Buffer) => {
    const text = buf.toString('utf8');
    if (verbose) process.stdout.write(prefix + text);
  };
  const emitErr = (buf: Buffer) => {
    const text = buf.toString('utf8');
    process.stderr.write(prefix + text);
  };

  // With stdio: 'pipe', these streams are present
  child.stdout.on('data', emit);
  child.stderr.on('data', emitErr);
  child.on('error', (err) => {
    process.stderr.write(`${prefix}${err.message}\n`);
  });

  return child;
};
