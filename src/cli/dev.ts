/* Dev loop orchestrator
 * - Watches author sources; debounces bursts; runs tasks in order: register → openapi.
 * - Optional local serving (--local inline|offline).
 * - Stage/env: seeds process.env with concrete values for the selected stage.
 */
import path from 'node:path';

import chokidar from 'chokidar';

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
    seedEnvForStage(root, stage, verbose);
  } catch (e) {
    if (verbose)
      console.warn('[dev] env seeding warning:', (e as Error).message);
  }
  const mode: LocalMode = opts.local;
  const port = typeof opts.port === 'number' ? opts.port : 0;

  if (verbose) {
    console.log(
      `[dev] options: register=${opts.register} openapi=${opts.openapi} ` +
        `local=${mode} stage=${stage} port=${port}`,
    );
  }

  // Single debounced queue
  let timer: NodeJS.Timeout | undefined;
  let running = false;
  let pending = false;
  // Local child (if any)
  let offline: OfflineRunner | undefined;
  let inlineChild: Awaited<ReturnType<typeof launchInline>> | undefined;

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void (async () => {
        if (running) {
          pending = true;
          return;
        }
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
          if (opts.openapi) {
            await runOpenapi(root, { verbose });
          }
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
            if (inlineChild) {
              // For simplicity restart on any queue execution; cheap in practice.
              if (verbose) console.log('[dev] restarting inline server...');
              await inlineChild.restart();
            }
          }
        } catch (e) {
          console.error('[dev] task error:', (e as Error).message);
        } finally {
          running = false;
          if (pending) schedule();
        }
      })();
    }, 250);
  };

  // Pre-flight run
  schedule();

  // Local serving
  if (mode === 'offline') {
    offline = await launchOffline(root, { stage, port, verbose });
  } else if (mode === 'inline') {
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
        if (offline) await offline.close();
        if (inlineChild) await inlineChild.close();
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

const seedEnvForStage = (
  root: string,
  stage: string,
  verbose: boolean,
): void => {
  // Best-effort: import app/config/app.config.ts via tsx is costly here; instead,
  // seed well-known keys if present in process.env, leaving existing values intact.
  // Teams can export additional keys in their shell if desired.
  const defaults: Record<string, string> = {
    STAGE: stage,
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (!(k in process.env)) {
      process.env[k] = v;
      if (verbose) console.log(`[dev] env: ${k}=${v}`);
    }
  }
};

// Inline local runner: spawn tsx to run a TS server script.
const launchInline = async (
  root: string,
  opts: { stage: string; port: number; verbose: boolean },
) => {
  const { spawn } = await import('node:child_process');
  const path = await import('node:path');
  const fs = await import('node:fs');
  const tsxCli = path.resolve(root, 'node_modules', 'tsx', 'dist', 'cli.js');
  const entry = path.resolve(root, 'src', 'cli', 'local', 'inline.server.ts');
  if (!fs.existsSync(entry)) {
    throw new Error(
      'inline server entry missing: src/cli/local/inline.server.ts',
    );
  }
  const args = [tsxCli, entry];
  if (!fs.existsSync(tsxCli)) {
    // Fallback to PATH resolution
    args.shift();
    args.unshift(process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
  } else {
    args.unshift(process.execPath);
  }
  const spawnChild = () =>
    spawn(args[0]!, args.slice(1), {
      cwd: root,
      stdio: 'inherit',
      shell: !args[0]!.endsWith('.js'),
      env: {
        ...process.env,
        SMOZ_STAGE: opts.stage,
        SMOZ_PORT: String(opts.port),
        SMOZ_VERBOSE: opts.verbose ? '1' : '',
      },
    });
  let child = spawnChild();
  const close = async () =>
    new Promise<void>((resolve) => {
      if (child.killed) {
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
    child = spawnChild();
  };
  return { close, restart };
};
