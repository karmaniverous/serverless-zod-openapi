import { mapEntries, shake } from 'radash';
import { z } from 'zod';

import {
  buildEnvSchema,
  deriveAllKeys,
  splitKeysBySchema,
} from '@/handler/envBuilder';
import { globalEnv, stageEnv } from '@/serverless/stages/env';
import { globalParamsSchema } from '@/serverless/stages/globalSchema';
import { stageParamsSchema } from '@/serverless/stages/stageSchema'; // types live there, but we import runtime schema below

/**
 * Safely set env vars for the duration of a test, omitting only `undefined` keys.
 * Avoids dynamic delete (ESLint).
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
 * Build the same env schema the app uses and synthesize valid string values for it.
 */
export const synthesizeEnvForSuccess = (): Record<string, string> => {
  const allKeys = deriveAllKeys(globalEnv, stageEnv, [] as const);
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

  if (!(envSchema instanceof z.ZodObject)) {
    throw new Error('Expected env schema to be a ZodObject');
  }

  const candidates: readonly string[] = [
    'us-east-1',
    'test',
    'dev',
    'prod',
    'true',
    'false',
    '1',
    '0',
    'application/json',
    'x',
  ];

  const tryCandidates = (schema: z.ZodType): string => {
    if (schema instanceof z.ZodEnum) return String(schema.options[0] ?? 'x');
    if (schema instanceof z.ZodLiteral) {
      const val = (schema as unknown as { value: unknown }).value;
      return String(val);
    }
    for (const c of candidates) {
      if (schema.safeParse(c).success) return c;
    }
    return 'x';
  };

  return mapEntries(envSchema.shape, (key, schema) => [
    key,
    tryCandidates(schema),
  ]) as Record<string, string>;
};
