import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type AppLike = {
  buildAllServerlessFunctions: () => Record<string, unknown>;
};

/**
 * Load downstream registers to populate the app registry.
 * Tries TS/JS candidates and logs which one was loaded when SMOZ_VERBOSE is set.
 */
export const loadRegisters = async (root: string): Promise<void> => {
  const candidates = [
    path.resolve(root, 'app', 'generated', 'register.functions.ts'),
    path.resolve(root, 'app', 'generated', 'register.functions.mts'),
    path.resolve(root, 'app', 'generated', 'register.functions.js'),
    path.resolve(root, 'app', 'generated', 'register.functions.mjs'),
  ];
  for (const p of candidates) {
    try {
      const url = pathToFileURL(p).href;
      await import(url);
      if (process.env.SMOZ_VERBOSE) {
        const rel = path.relative(root, p).split(path.sep).join('/');
        console.log('[inline] registers loaded:', rel);
      }
      return;
    } catch {
      // try next candidate
    }
  }
  console.warn(
    '[inline] Could not load app/generated/register.functions.*. Run "npx smoz register" before inline dev.',
  );
};

/**
 * Load the App instance (TS source) from the downstream project.
 * Returns only the surface needed by the inline server.
 */
export const loadApp = async (root: string): Promise<AppLike> => {
  const p = path.resolve(root, 'app', 'config', 'app.config.ts');
  const url = pathToFileURL(p).href;
  const mod = (await import(url)) as Record<string, unknown>;
  const app = mod.app as AppLike | undefined;
  if (!app || typeof app.buildAllServerlessFunctions !== 'function') {
    throw new Error(
      'Failed to load app/config/app.config.ts (missing export "app").',
    );
  }
  return app;
};
