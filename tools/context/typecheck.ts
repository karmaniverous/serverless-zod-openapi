import { spawnSync } from 'node:child_process';

import { promises as fs } from 'fs';
import { createRequire } from 'module';
import path from 'path';

import { modulePathFromRoot } from '../../src/modulePathFromRoot';

const require = createRequire(import.meta.url);

// The directory of this module relative to the repo root, using your helper.
// Example: "tools/context"
const hereFromRoot = modulePathFromRoot(import.meta.url);

// OUT directory lives *next to this script*.
const OUT_DIR = path.resolve(process.cwd(), hereFromRoot, 'out');
const OUT_TXT = path.join(OUT_DIR, 'typecheck.txt');

// Prefer solution build (monorepo-wide); fallback to root-only if missing.
const BUILD_CONFIG = path.resolve(process.cwd(), 'tsconfig.build.json');
const ROOT_CONFIG = path.resolve(process.cwd(), 'tsconfig.json');

const exists = async (p: string): Promise<boolean> => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

const main = async (): Promise<void> => {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const hasBuild = await exists(BUILD_CONFIG);

  // Resolve local TypeScript CLI entry and invoke via Node for portability.
  // If resolution fails, fallback to PATH "tsc".
  let tscEntry = 'tsc';
  let useNodeWrapper = false;
  try {
    tscEntry = require.resolve('typescript/bin/tsc');
    useNodeWrapper = true;
  } catch {
    tscEntry = 'tsc';
    useNodeWrapper = false;
  }

  const args = hasBuild
    ? ['-b', BUILD_CONFIG, '--noEmit', '--pretty', 'false']
    : ['--project', ROOT_CONFIG, '--noEmit', '--pretty', 'false'];

  const cmd = useNodeWrapper ? process.execPath : tscEntry;
  const cmdArgs = useNodeWrapper ? [tscEntry, ...args] : args;

  const res = spawnSync(cmd, cmdArgs, {
    encoding: 'utf-8',
    windowsHide: true,
  });

  // Combine stdout+stderr because tsc prints diagnostics to stderr.
  const raw = `${res.stdout}${res.stderr}`;
  await fs.writeFile(OUT_TXT, raw, 'utf8');

  // Mirror tsc exit behavior exactly
  if (typeof res.status === 'number') {
    process.exitCode = res.status;
  } else {
    // If status is null (rare), infer failure from TS error lines
    process.exitCode = /(?:^|\n)\s*error\s+TS\d+:/m.test(raw) ? 1 : 0;
  }
};

main().catch((err: unknown) => {
  console.error(
    err instanceof Error ? (err.stack ?? err.message) : String(err),
  );
  process.exitCode = 1;
});
