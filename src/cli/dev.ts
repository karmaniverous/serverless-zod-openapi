/* Dev loop orchestrator
 * - Prefers inline dev (packaged entry) when tsx is available; falls back to offline when not.
 * - Watches author sources; debounces bursts; runs tasks in order: register → openapi.
 * - Optional local serving (--local inline|offline).
 * - Stage/env: seeds process.env with concrete values for the selected stage.
 */
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import chokidar from 'chokidar';
import fs from 'fs-extra';
import { packageDirectorySync } from 'package-directory';

import { launchOffline, type OfflineRunner } from './local/offline';
import { runOpenapi } from './openapi';
import { runRegister } from './register';
export type LocalMode = false | 'inline' | 'offline';
export const runDev = async (
  root: string,
  opts: {
    register: boolean;
    openapi: boolean;
    local: LocalMode;
    stage?: string;
    port?: number;
    verbose?: boolean;
  },
): Promise<void> => {
  const verbose = !!opts.verbose;
  const stage =
    typeof opts.stage === 'string'
      ? opts.stage
      : inferDefaultStage(root, verbose);
  // Seed env with concrete values for the selected stage.
  try {
    await seedEnvForStage(root, stage, verbose);
  } catch (e) {
    if (verbose)
      console.warn('[dev] env seeding warning:', (e as Error).message);
  }
  const modeInitial: LocalMode = opts.local;
  const mode: LocalMode = modeInitial;
  const port = typeof opts.port === 'number' ? opts.port : 0;

  if (verbose) {
    console.log(
      `[dev] options: register=${String(opts.register)} ` +
        `openapi=${String(opts.openapi)} ` +
        `local=${String(mode)} ` +
        `stage=${stage} ` +
        `port=${String(port)}`,
    );
  }

  // Single debounced queue
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let pending = false;
  // Small executor we can use for both pre-flight and queued runs
  const executeOnce = async (): Promise<{
    wrote: boolean;
    openapiChanged: boolean;
  }> => {
    if (running) return { wrote: false, openapiChanged: false };
    running = true;
    pending = false;
    try {
      let wrote = false;
      if (opts.register) {
        const res = await runRegister(root);
        wrote = res.wrote.length > 0;
        console.log(
          res.wrote.length
            ? `Updated:\n - ${res.wrote.join('\n - ')}`
            : 'No changes.',
        );
      }
      let openapiChanged = false;
      if (opts.openapi) {
        openapiChanged = await runOpenapi(root, { verbose });
      }
      return { wrote, openapiChanged };
    } catch (e) {
      console.error('[dev] task error:', (e as Error).message);
      return { wrote: false, openapiChanged: false };
    } finally {
      running = false;
      // If a burst arrived while we were running, schedule again
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (pending) schedule();
    }
  };
  // Local child (if any)
  let offline: OfflineRunner | undefined;
  let inlineChild: Awaited<ReturnType<typeof launchInline>> | undefined;

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void (async () => {
        pending = false;
        const { wrote, openapiChanged } = await executeOnce();
        // Local backend refresh
        if (mode === 'offline') {
          // Restart only when route-surface can change (register wrote)
          if (wrote && offline) {
            if (verbose)
              console.log(
                '[dev] restarting serverless-offline (register changed)...',
              );
            await offline.restart();
          }
        } else if (mode === 'inline') {
          // Restart inline only if something material changed
          if (wrote || openapiChanged) {
            if (verbose) console.log('[dev] restarting inline server...');
            // inlineChild is created when mode === 'inline'; guard for safety
            if (inlineChild) {
              await inlineChild.restart();
            }
          }
        }
      })();
    }, 250);
  };
  // Pre-flight: run tasks before launching the local backend to avoid an immediate restart
  await executeOnce();

  // Local serving
  if (mode === 'offline') {
    offline = await launchOffline(root, { stage, port, verbose });
  } else if (mode === 'inline') {
    // Hard error on failure; no fallback to offline.
    inlineChild = await launchInline(root, { stage, port, verbose });
  }

  // Watch sources
  const globs = [
    path.join(root, 'app', 'functions', '**', 'lambda.ts'),
    path.join(root, 'app', 'functions', '**', 'openapi.ts'),
    path.join(root, 'app', 'functions', '**', 'serverless.ts'),
  ];
  if (verbose)
    console.log(
      '[dev] watching:',
      globs.map((g) => path.posix.normalize(g)).join(', '),
    );
  const watcher = chokidar.watch(globs, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  });
  watcher.on('add', schedule).on('change', schedule).on('unlink', schedule);

  // Keep process alive until SIGINT
  await new Promise<void>((resolve) => {
    const stop = async () => {
      try {
        await watcher.close();
        await offline?.close();
        await inlineChild?.close();
      } finally {
        resolve();
      }
    };
    process.on('SIGINT', () => {
      void stop();
    });
    process.on('SIGTERM', () => {
      void stop();
    });
  });
};
const inferDefaultStage = (root: string, verbose: boolean): string => {
  // Prefer “dev”; if app.config.ts is available and we can inspect it cheaply later, expand behavior.
  // For now, return 'dev' (explicit selection via --stage remains available).
  if (verbose)
    console.log('[dev] inferring stage: dev (explicit --stage overrides)');
  return 'dev';
};

const seedEnvForStage = async (
  root: string,
  stage: string,
  verbose: boolean,
): Promise<void> => {
  // Best effort: import the app config to read declared env keys and concrete values.
  // Preserve existing process.env values; only seed when unset.
  try {
    const appConfigUrl = pathToFileURL(
      path.resolve(root, 'app', 'config', 'app.config.ts'),
    ).href;
    // Dynamically import the TS module under tsx
    const mod = (await import(appConfigUrl)) as Record<string, unknown>;
    const app = mod.app as
      | {
          global?: { envKeys?: readonly string[] };
          stage?: { envKeys?: readonly string[] };
        }
      | undefined;
    const stages = mod.stages as
      | {
          default?: { params?: Record<string, unknown> };
          [k: string]: unknown;
        }
      | undefined;
    const globalKeys: readonly unknown[] = Array.isArray(app?.global?.envKeys)
      ? app.global.envKeys
      : [];
    const stageKeys: readonly unknown[] = Array.isArray(app?.stage?.envKeys)
      ? app.stage.envKeys
      : [];
    const globalParams =
      (stages?.default as { params?: Record<string, unknown> }).params ?? {};
    const stageParams =
      (stages?.[stage] as { params?: Record<string, unknown> }).params ?? {};

    const seedPair = (key: string, from: Record<string, unknown>) => {
      if (key in process.env) return;
      const val = from[key];
      if (val === undefined) return;
      if (typeof val === 'string') {
        process.env[key] = val;
        if (verbose) console.log(`[dev] env: ${key}=${val}`);
        return;
      }
      if (typeof val === 'number' || typeof val === 'boolean') {
        const v = String(val);
        process.env[key] = v;
        if (verbose) console.log(`[dev] env: ${key}=${v}`);
        return;
      }
      // Non-primitive; skip to avoid [object Object] surprise.
      if (verbose) console.log(`[dev] env: skip ${key} (non-primitive)`);
    };

    for (const k of globalKeys) {
      if (typeof k === 'string') {
        seedPair(k, globalParams);
      }
    }
    for (const k of stageKeys) {
      if (typeof k === 'string') {
        seedPair(k, stageParams);
      }
    }
    // Ensure STAGE itself is present as a last resort
    if (!process.env.STAGE) {
      process.env.STAGE = stage;
      if (verbose) console.log(`[dev] env: STAGE=${stage}`);
    }
  } catch {
    // Fallback: seed STAGE only
    if (!process.env.STAGE) {
      process.env.STAGE = stage;
      if (verbose) console.log(`[dev] env: STAGE=${stage}`);
    }
  }
};

// Resolve a tsx invocation for the given root + TS entry.
// - Prefer project-local tsx JS CLI: node <root>/node_modules/tsx/dist/cli.js <entry>
// - Fallback to PATH: "tsx <entry>" (shell=true)
// - Throw a hard error when unavailable.
export const resolveTsxCommand = (
  root: string,
  tsEntry: string,
): { cmd: string; args: string[]; shell: boolean } => {
  const localCli = path.resolve(root, 'node_modules', 'tsx', 'dist', 'cli.js');
  if (fs.pathExistsSync(localCli)) {
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

// Inline local runner: always use tsx for the TS entry.
const launchInline = async (
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
