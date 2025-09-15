import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const inferDefaultStage = (root: string, verbose: boolean): string => {
  void root;
  // Prefer “dev”; explicit --stage overrides remain available.
  if (verbose)
    console.log('[dev] inferring stage: dev (explicit --stage overrides)');
  return 'dev';
};

export const seedEnvForStage = async (
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
