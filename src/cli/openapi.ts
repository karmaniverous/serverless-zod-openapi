/* OpenAPI one-shot runner: spawn the project-local OpenAPI script via tsx.
 * - Mirrors the npm script: tsx app/config/openapi && prettier (project-local script already formats).
 * - Keeps CLI responsibilities minimal; errors bubble via non-zero exit.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const findTsxCli = (
  root: string,
): { cmd: string; args: string[]; shell: boolean } => {
  // Prefer invoking the JS entry to avoid shell .cmd quirks on Windows.
  const js = path.resolve(root, 'node_modules', 'tsx', 'dist', 'cli.js');
  if (existsSync(js)) {
    return {
      cmd: process.execPath,
      args: [js, 'app/config/openapi.ts'],
      shell: false,
    };
  }
  // Fallback to "tsx" on PATH (may rely on shell resolution).
  const cmd = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';
  return { cmd, args: ['app/config/openapi.ts'], shell: true };
};

export const runOpenapi = async (
  root: string,
  opts?: { verbose?: boolean },
): Promise<void> => {
  const { cmd, args, shell } = findTsxCli(root);
  if (opts?.verbose) {
    console.log(`[openapi] ${[cmd, ...args].join(' ')}`);
  }
  const res = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell,
  });
  if (typeof res.status !== 'number' || res.status !== 0) {
    const code =
      typeof res.status === 'number' ? String(res.status) : 'unknown';
    throw new Error(`openapi failed (exit ${code})`);
  }
};
