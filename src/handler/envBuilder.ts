import type { ZodObject, ZodRawShape } from 'zod';
import { z } from 'zod';

/** Derive the exact set of keys for this function’s env. */
export const deriveAllKeys = <
  GK extends string,
  SK extends string,
  FK extends string,
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

/** Partition into keys present in each schema’s shape. */
export const splitKeysBySchema = <GK extends string, SK extends string>(
  all: ReadonlySet<GK | SK>,
  globalSchema: ZodObject<ZodRawShape>,
  stageSchema: ZodObject<ZodRawShape>,
): { globalPick: readonly GK[]; stagePick: readonly SK[] } => {
  const gShape = globalSchema.shape;
  const sShape = stageSchema.shape;

  const g: GK[] = [];
  const s: SK[] = [];

  all.forEach((k) => {
    const key = k as unknown as string;
    if (key in gShape) g.push(k as GK);
    if (key in sShape) s.push(k as SK);
  });

  return { globalPick: g, stagePick: s };
};

/** Compose a Zod schema with exactly the picked keys. */
export const buildEnvSchema = <GK extends string, SK extends string>(
  globalPick: readonly GK[],
  stagePick: readonly SK[],
  globalSchema: ZodObject<ZodRawShape>,
  stageSchema: ZodObject<ZodRawShape>,
): ZodObject<ZodRawShape> => {
  const toPick = (keys: readonly string[]): Record<string, true> =>
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
