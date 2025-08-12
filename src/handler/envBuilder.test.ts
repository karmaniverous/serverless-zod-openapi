import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// If you want a strict union for function-level keys in this test file:
import type { AllParams } from '@/test/stages';
// Use the test fixture (mirrors prod surface, different values/keys)
import { globalParamsSchema as testGlobalSchema } from '@/test/stages/globalSchema';
import { stageParamsSchema as testStageSchema } from '@/test/stages/stageSchema';
type ParamKeys = keyof AllParams;

import {
  buildEnvSchema,
  deriveAllKeys,
  isHead,
  parseTypedEnv,
  splitKeysBySchema,
} from './envBuilder';

describe('envBuilder helpers (using test stages fixture)', () => {
  // Local aliases for readability; these are the test schemas.
  const globalSchema = testGlobalSchema;
  const stageSchema = testStageSchema;

  // Typed key lists (const tuples keep the literal unions narrow).
  // From test fixture, globalEnv exposes SERVICE_NAME and PROFILE
  const globalEnv = ['SERVICE_NAME', 'PROFILE'] as const;

  // From test fixture, stageEnv exposes STAGE
  const stageEnv = ['STAGE'] as const;

  // Function-specific keys for this test (not in the always-exposed lists).
  // Use FN_ENV (global) + DOMAIN_NAME (stage) to exercise both sides.
  const fnEnv = [
    'FN_ENV',
    'DOMAIN_NAME',
  ] as const satisfies readonly ParamKeys[];

  it('deriveAllKeys returns the exact union set (global ∪ stage ∪ function)', () => {
    const keys = deriveAllKeys(globalEnv, stageEnv, fnEnv);
    expect(keys.size).toBe(5);
    expect(Array.from(keys).sort()).toEqual(
      ['PROFILE', 'SERVICE_NAME', 'STAGE', 'FN_ENV', 'DOMAIN_NAME'].sort(),
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
      new Set(['SERVICE_NAME', 'PROFILE', 'FN_ENV']),
    );
    expect(new Set(stagePick)).toEqual(new Set(['STAGE', 'DOMAIN_NAME']));
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

    expect(envSchema instanceof z.ZodObject).toBe(true);

    const shapeKeys = Object.keys(envSchema.shape);
    expect([...shapeKeys].sort()).toEqual(
      ['PROFILE', 'SERVICE_NAME', 'STAGE', 'FN_ENV', 'DOMAIN_NAME'].sort(),
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
      FN_ENV: 'fnval',
      STAGE: 'dev',
      DOMAIN_NAME: 'api.dev.example.test',
      EXTRA: 'ignored', // should be stripped by Zod
    });

    expect(parsed).toEqual({
      SERVICE_NAME: 'svc',
      PROFILE: 'dev-profile',
      FN_ENV: 'fnval',
      STAGE: 'dev',
      DOMAIN_NAME: 'api.dev.example.test',
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
        FN_ENV: 'fnval',
        STAGE: 'dev',
        DOMAIN_NAME: 'api.dev.example.test',
      });

    expect(run).toThrowError();
  });

  it('isHead detects HEAD and ignores others', () => {
    expect(isHead('HEAD')).toBe(true);
    expect(isHead('GET')).toBe(false);
    expect(isHead(undefined)).toBe(false);
  });
});
