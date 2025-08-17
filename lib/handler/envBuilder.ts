/**
 * REQUIREMENTS ADDRESSED
 * - Derive an environment schema from Global & Stage Zod schemas and an allowlist of keys.
 * - Provide utilities to merge env key sets and to parse process.env into a typed object.
 * - No dynamic imports; no defaults for generic parameters.
 */
import type { ZodObject, ZodRawShape } from 'zod';
import { z } from 'zod';

/** Union all env keys we plan to expose into a single set. */
export const deriveAllKeys = (
  globalEnv: readonly PropertyKey[],
  stageEnv: readonly PropertyKey[],
  fnEnv: readonly PropertyKey[] = [],
): ReadonlySet<PropertyKey> => {
  const out = new Set<PropertyKey>();
  globalEnv.forEach((k) => out.add(k));
  stageEnv.forEach((k) => out.add(k));
  fnEnv.forEach((k) => out.add(k));
  return out;
};

/** Split the unioned keys by which Zod schema defines them. */
export const splitKeysBySchema = <
  G extends ZodObject<ZodRawShape>,
  S extends ZodObject<ZodRawShape>,
>(
  allKeys: ReadonlySet<PropertyKey>,
  globalParamsSchema: G,
  stageParamsSchema: S,
): {
  globalPick: readonly (keyof z.infer<G>)[];
  stagePick: readonly (keyof z.infer<S>)[];
} => {
  const gKeySet = new Set(Object.keys(globalParamsSchema.shape));
  const sKeySet = new Set(Object.keys(stageParamsSchema.shape));
  const globalPick = [...allKeys].filter((k): k is keyof z.infer<G> =>
    gKeySet.has(String(k)),
  );

  const stagePick = [...allKeys].filter((k): k is keyof z.infer<S> => {
    const key = String(k);
    return sKeySet.has(key) && !gKeySet.has(key);
  });

  return { globalPick, stagePick };
};

/** Build a Zod schema that picks only the requested keys from both schemas. */
export const buildEnvSchema = <
  G extends ZodObject<ZodRawShape>,
  S extends ZodObject<ZodRawShape>,
>(
  globalPick: readonly (keyof z.infer<G>)[],
  stagePick: readonly (keyof z.infer<S>)[],
  globalParamsSchema: G,
  stageParamsSchema: S,
) => {
  const toPick = (keys: readonly string[]) =>
    Object.fromEntries(keys.map((k) => [k, true])) as Record<string, true>;

  const gPicked = globalParamsSchema.pick(
    toPick(globalPick as readonly string[]),
  );
  const sPicked = stageParamsSchema.pick(
    toPick(stagePick as readonly string[]),
  );

  return z.object({}).extend(gPicked.shape).extend(sPicked.shape);
};

/** Parse an arbitrary source (e.g., process.env) with a provided env schema. */
export const parseTypedEnv = <T extends z.ZodType>(
  envSchema: T,
  envSource: Record<string, unknown>,
): z.infer<T> => envSchema.parse(envSource);
