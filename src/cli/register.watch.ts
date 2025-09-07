/* REQUIREMENTS ADDRESSED
- Provide a testable watch helper for `smoz register --watch` with debounce.
- Allow an injectable watcher factory so unit tests can simulate events.
- Preserve production behavior using chokidar when no factory is provided.
*/
import { join } from 'node:path';

export type Watcher = {
  on: (
    event: 'add' | 'change' | 'unlink',
    cb: () => void,
  ) => Watcher;
  close: () => void;
};

export type WatchFactory = (globs: string[]) => Watcher;

/**
 * Start a debounced watcher that triggers `runOnce` on file changes.
 *
 * @param root - repository root
 * @param runOnce - function that regenerates register files (idempotent)
 * @param opts - debounceMs and optional custom watch factory (for tests)
 * @returns a promise that resolves to a close function
 */
export const watchRegister = async (
  root: string,
  runOnce: () => Promise<void>,
  opts?: { debounceMs?: number; watchFactory?: WatchFactory },
): Promise<() => void> => {
  const debounceMs = opts?.debounceMs ?? 250;
  const globs = [
    join(root, 'app', 'functions', '**', 'lambda.ts'),
    join(root, 'app', 'functions', '**', 'openapi.ts'),
    join(root, 'app', 'functions', '**', 'serverless.ts'),
  ];

  let factory: WatchFactory;
  if (opts?.watchFactory) {
    factory = opts.watchFactory;
  } else {
    // Lazy-load chokidar in production
    const chokidar = (await import('chokidar')).default;
    factory = (patterns: string[]) =>
      chokidar.watch(patterns, {
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
      });
  }

  const watcher = factory(globs);
  let timer: NodeJS.Timeout | undefined;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void runOnce();
    }, debounceMs);
  };

  watcher.on('add', schedule).on('change', schedule).on('unlink', schedule);

  return () => {
    if (timer) clearTimeout(timer);
    watcher.close();
  };
};

