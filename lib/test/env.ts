import { shake } from 'radash';
import { z } from 'zod';

import {
  buildEnvSchema,
  deriveAllKeys,
  splitKeysBySchema,
} from '@@/lib/handler/envBuilder';
import {
  globalEnvKeys,
  globalParamsSchema,
} from '@@/lib/test/serverless/config/global';
import {
  stageEnvKeys,
  stageParamsSchema,
} from '@@/lib/test/serverless/config/stage';

/**
 * Temporarily set env vars for the duration of a test.
 * Keys with `undefined` will be removed; others set to the given string.
 */
export const withTempEnv = async <T>(
  vars: Record<string, string | undefined>,
  run: () => T | Promise<T>,
): Promise<T> => {
  const original = { ...process.env };
  process.env = shake({ ...original, ...vars });

  try {
    return await run();
  } finally {
    process.env = original;
  }
};

/**
 * Build the same env schema the app uses, then synthesize valid string values.
 */
export const synthesizeEnvForSuccess = (): Record<string, string> => {
  const allKeys = deriveAllKeys(globalEnvKeys, stageEnvKeys, [] as const);

  const { globalPick, stagePick } = splitKeysBySchema(
    allKeys,
    globalParamsSchema,
    stageParamsSchema,
  );

  const envSchema = buildEnvSchema(
    globalPick,
    stagePick,
    globalParamsSchema,
    stageParamsSchema,
  );

  const candidates = [
    'us-east-1',
    'us-west-2',
    'test',
    'dev',
    'prod',
    'true',
    'false',
    '1',
    '0',
    'application/json',
    'x',
  ] as const;

  const choose = (schema: z.ZodType): string => {
    if (schema instanceof z.ZodEnum) return String(schema.options[0] ?? 'x');
    if (schema instanceof z.ZodLiteral) {
      return schema.value as string;
    }
    for (const c of candidates) {
      if (schema.safeParse(c).success) return c;
    }
    return 'x';
  };

  const out: Record<string, string> = {};
  for (const [key, schema] of Object.entries(envSchema.shape) as Array<
    [string, z.ZodType]
  >) {
    out[key] = choose(schema);
  }
  return out;
};
