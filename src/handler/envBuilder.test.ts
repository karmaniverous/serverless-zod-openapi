import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { GlobalParams } from '@/serverless/stages/globalSchema';
import type { StageParams } from '@/serverless/stages/stageSchema';

import {
  buildEnvSchema,
  deriveAllKeys,
  isHead,
  type ParamKeys,
  parseTypedEnv,
  splitKeysBySchema,
} from './envBuilder';

describe('envBuilder helpers', () => {
  // Minimal runtime schemas that reflect real shapes for the keys we exercise.
  const globalSchema = z.object({
    SERVICE_NAME: z.string(),
    PROFILE: z.string(),
    TEST_GLOBAL_ENV: z.string(),
  });

  const stageSchema = z.object({
    STAGE: z.string(),
    TEST_STAGE_ENV: z.string(),
  });

  // Typed key lists (const tuples keep the literal unions narrow).
  const globalEnv = [
    'SERVICE_NAME',
    'PROFILE',
  ] as const satisfies readonly (keyof GlobalParams)[];

  const stageEnv = ['STAGE'] as const satisfies readonly (keyof StageParams)[];

  const fnEnv = [
    'TEST_STAGE_ENV',
    'TEST_GLOBAL_ENV',
  ] as const satisfies readonly ParamKeys[];

  it('deriveAllKeys returns the exact union set (global ∪ stage ∪ function)', () => {
    const keys = deriveAllKeys(globalEnv, stageEnv, fnEnv);
    expect(keys.size).toBe(5);
    expect(Array.from(keys).sort()).toEqual(
      [
        'PROFILE',
        'SERVICE_NAME',
        'STAGE',
        'TEST_GLOBAL_ENV',
        'TEST_STAGE_ENV',
      ].sort(),
    );
  });

  it('splitKeysBySchema partitions keys according to schema key sets', () => {
    const all = deriveAllKeys(globalEnv, stageEnv, fnEnv);
    const { globalPick, stagePick } = splitKeysBySchema(
      all,
      globalSchema,
      stageSchema,
    );

    expect(new Set(globalPick)).toEqual(
      new Set<keyof GlobalParams>([
        'SERVICE_NAME',
        'PROFILE',
        'TEST_GLOBAL_ENV',
      ]),
    );
    expect(new Set(stagePick)).toEqual(
      new Set<keyof StageParams>(['STAGE', 'TEST_STAGE_ENV']),
    );
  });

  it('buildEnvSchema composes a schema with exactly the picked keys', () => {
    const all = deriveAllKeys(globalEnv, stageEnv, fnEnv);
    const { globalPick, stagePick } = splitKeysBySchema(
      all,
      globalSchema,
      stageSchema,
    );
    const envSchema = buildEnvSchema(
      globalPick,
      stagePick,
      globalSchema,
      stageSchema,
    );

    // Narrow safely to ZodObject (Zod v4)
    if (!(envSchema instanceof z.ZodObject)) {
      throw new Error('Expected env schema to be a ZodObject');
    }

    // Use a typed Object.keys to list the shape keys
    const shapeKeys = Object.keys(
      envSchema.shape,
    ) as (keyof typeof envSchema.shape)[];
    expect([...shapeKeys].sort()).toEqual(
      [
        'PROFILE',
        'SERVICE_NAME',
        'STAGE',
        'TEST_GLOBAL_ENV',
        'TEST_STAGE_ENV',
      ].sort(),
    );
  });

  it('parseTypedEnv returns the typed env object on success', () => {
    const all = deriveAllKeys(globalEnv, stageEnv, fnEnv);
    const { globalPick, stagePick } = splitKeysBySchema(
      all,
      globalSchema,
      stageSchema,
    );
    const envSchema = buildEnvSchema(
      globalPick,
      stagePick,
      globalSchema,
      stageSchema,
    );

    const parsed = parseTypedEnv(envSchema, {
      SERVICE_NAME: 'svc',
      PROFILE: 'dev-profile',
      TEST_GLOBAL_ENV: 'g-env',
      STAGE: 'dev',
      TEST_STAGE_ENV: 's-env',
      EXTRA: 'ignored', // should be stripped by Zod
    });

    expect(parsed).toEqual({
      SERVICE_NAME: 'svc',
      PROFILE: 'dev-profile',
      TEST_GLOBAL_ENV: 'g-env',
      STAGE: 'dev',
      TEST_STAGE_ENV: 's-env',
    });
  });

  it('parseTypedEnv throws when a required key is missing', () => {
    const all = deriveAllKeys(globalEnv, stageEnv, fnEnv);
    const { globalPick, stagePick } = splitKeysBySchema(
      all,
      globalSchema,
      stageSchema,
    );
    const envSchema = buildEnvSchema(
      globalPick,
      stagePick,
      globalSchema,
      stageSchema,
    );

    // Omit PROFILE to trigger a validation error.
    const run = () =>
      parseTypedEnv(envSchema, {
        SERVICE_NAME: 'svc',
        TEST_GLOBAL_ENV: 'g-env',
        STAGE: 'dev',
        TEST_STAGE_ENV: 's-env',
      });

    expect(run).toThrowError();
  });

  it('isHead detects HEAD and ignores others', () => {
    expect(isHead('HEAD')).toBe(true);
    expect(isHead('GET')).toBe(false);
    expect(isHead(undefined)).toBe(false);
  });
});
