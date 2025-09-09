/* serverless-offline runner (child process)
 * - Spawns the project-local serverless binary (JS entry) with "offline start".
 * - Provides close/restart helpers; streams stdio; preserves flags.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

export type OfflineRunner = {
  close: () => Promise<void>;
  restart: () => Promise<void>;
};

export const launchOffline = async (
  root: string,
  opts: { stage: string; port: number; verbose: boolean },
): Promise<OfflineRunner> => {
  const slsJs = path.resolve(
    root,
    'node_modules',
    'serverless',
    'bin',
    'serverless.js',
  );
  if (!existsSync(slsJs)) {
    throw new Error(
      'serverless (v4) not found locally. Install it (devDependency) to use --local offline.',
    );
  }
  const baseArgs = [
    slsJs,
    'offline',
    'start',
    '--stage',
    opts.stage,
    '--httpPort',
    String(opts.port ?? 0),
  ];
  const spawnChild = () =>
    spawn(process.execPath, baseArgs, {
      cwd: root,
      stdio: 'inherit',
      shell: false,
      env: { ...process.env },
    });

  let child = spawnChild();
  const close = async (): Promise<void> =>
    new Promise<void>((resolve) => {
      if (!child || child.killed) {
        resolve();
        return;
      }
      child.once('exit', () => {
        resolve();
      });
      child.kill('SIGTERM');
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  const restart = async (): Promise<void> => {
    await close();
    child = spawnChild();
  };
  return { close, restart };
};
