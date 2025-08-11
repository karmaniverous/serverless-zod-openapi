// src/handler/envBuilder.ts
import type { ZodObject, ZodRawShape } from 'zod';
import { z } from 'zod';

/** Derive the exact set of keys for this function’s env. */
export const deriveAllKeys = <
  GK extends PropertyKey,
  SK extends PropertyKey,
  FK extends PropertyKey,
>(
  globalEnv: readonly GK[],
  stageEnv: readonly SK[],
  fnEnv: readonly (GK | SK | FK)[],
): Set<GK | SK | FK> => {
  const out = new Set<GK | SK | FK>();
  globalEnv.forEach((k) => out.add(k));
  stageEnv.forEach((k) => out.add(k));
  fnEnv.forEach((k) => out.add(k));
  return out;
};

/** Split a combined key set into the portions belonging to each schema. */
export const splitKeysBySchema = <
  G extends ZodObject<ZodRawShape>,
  S extends ZodObject<ZodRawShape>,
>(
  allKeys: ReadonlySet<PropertyKey>,
  globalSchema: G,
  stageSchema: S,
): {
  globalPick: (keyof z.infer<G>)[];
  stagePick: (keyof z.infer<S>)[];
} => {
  const gKeySet = new Set(Object.keys(globalSchema.shape));
  const sKeySet = new Set(Object.keys(stageSchema.shape));

  // global = intersection(allKeys, globalSchema)
  const globalPick = [...allKeys].filter((k): k is keyof z.infer<G> =>
    gKeySet.has(String(k)),
  );

  // stage = intersection(allKeys, stageSchema) MINUS global keys
  const stagePick = [...allKeys].filter((k): k is keyof z.infer<S> => {
    const key = String(k);
    return sKeySet.has(key) && !gKeySet.has(key);
  });

  return { globalPick, stagePick };
};

/** Build a Zod schema from picked keys of both global & stage schemas. */
export const buildEnvSchema = <
  G extends ZodObject<ZodRawShape>,
  S extends ZodObject<ZodRawShape>,
>(
  globalPick: readonly (keyof z.infer<G>)[],
  stagePick: readonly (keyof z.infer<S>)[],
  globalSchema: G,
  stageSchema: S,
) => {
  const toPick = (keys: readonly string[]) =>
    Object.fromEntries(keys.map((k) => [k, true])) as Record<string, true>;

  const gPicked = globalSchema.pick(toPick(globalPick as readonly string[]));
  const sPicked = stageSchema.pick(toPick(stagePick as readonly string[]));

  return z.object({}).extend(gPicked.shape).extend(sPicked.shape);
};

export const parseTypedEnv = <T extends z.ZodType>(
  envSchema: T,
  envSource: Record<string, unknown>,
): z.infer<T> => envSchema.parse(envSource);

export const isHead = (method: string | undefined): boolean =>
  method === 'HEAD';
