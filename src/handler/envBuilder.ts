import type { ZodObject, ZodRawShape } from 'zod';
import { z } from 'zod';

import type { GlobalParams } from '@/serverless/stages/globalSchema';
import type { StageParams } from '@/serverless/stages/stageSchema';

export type ParamKeys = keyof GlobalParams | keyof StageParams;

/**
 * Derive the exact set of keys for this function’s env:
 *   global exposed ∪ stage exposed ∪ function-specific keys
 */
export const deriveAllKeys = (
  globalEnv: readonly (keyof GlobalParams)[],
  stageEnv: readonly (keyof StageParams)[],
  fnEnv: readonly ParamKeys[],
): ReadonlySet<ParamKeys> =>
  new Set<ParamKeys>([...globalEnv, ...stageEnv, ...fnEnv]);

/**
 * Split the key set into "global schema keys" and "stage schema keys".
 * Uses the runtime schema key lists to avoid leaking unknown keys.
 */
export const splitKeysBySchema = (
  allKeys: ReadonlySet<ParamKeys>,
  globalSchema: ZodObject<ZodRawShape>,
  stageSchema: ZodObject<ZodRawShape>,
): {
  globalPick: readonly (keyof GlobalParams)[];
  stagePick: readonly (keyof StageParams)[];
} => {
  // In Zod v4, keyof().options is a readonly array of field names.
  const globalFieldNames = new Set(
    globalSchema.keyof().options as readonly (keyof GlobalParams)[],
  );
  const stageFieldNames = new Set(
    stageSchema.keyof().options as readonly (keyof StageParams)[],
  );

  const globalPick = [...allKeys].filter((k): k is keyof GlobalParams =>
    globalFieldNames.has(k as keyof GlobalParams),
  );
  const stagePick = [...allKeys].filter((k): k is keyof StageParams =>
    stageFieldNames.has(k as keyof StageParams),
  );

  return { globalPick, stagePick };
};

/** Helper to build a Zod pick object shape selector without `any`. */
const pickObj = (keys: readonly string[]) =>
  Object.fromEntries(keys.map((k) => [k, true])) as Record<string, true>;

/**
 * Compose a runtime env schema from the two source schemas,
 * picking only the requested fields from each, then extending shapes.
 * (Use .extend(shape) instead of .merge to avoid deprecation.)
 */
export const buildEnvSchema = (
  globalPick: readonly (keyof GlobalParams)[],
  stagePick: readonly (keyof StageParams)[],
  globalSchema: ZodObject<ZodRawShape>,
  stageSchema: ZodObject<ZodRawShape>,
): ZodObject<ZodRawShape> => {
  const globalPicked = globalSchema.pick(pickObj(globalPick));
  const stagePicked = stageSchema.pick(pickObj(stagePick));

  return z.object({}).extend(globalPicked.shape).extend(stagePicked.shape);
};

/**
 * Parse and return a typed env object. Zod v4's inference drives the type.
 */
export const parseTypedEnv = <T extends z.ZodType>(
  envSchema: T,
  envSource: Record<string, unknown>,
): z.infer<T> => envSchema.parse(envSource);

/** HEAD check (kept separate so you can test it trivially). */
export const isHead = (method: string | undefined): boolean =>
  method === 'HEAD';
