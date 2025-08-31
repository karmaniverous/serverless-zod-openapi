import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// Use the test fixture (mirrors prod surface, different values/keys)
import {
  globalEnvKeys,
  globalParamsSchema,
} from '@@/src/test/serverless/config/global';
import {
  stageEnvKeys,
  stageParamsSchema,
} from '@@/src/test/serverless/config/stage';
// If you want a strict union for function-level keys in this test file:
import type { AllParamsKeys } from '@@/src/test/serverless/config/stages';

import {
  buildEnvSchema,
  deriveAllKeys,
  isHead,
  parseTypedEnv,
  splitKeysBySchema,
} from './envBuilder';

describe('envBuilder helpers (using test stages fixture)', () => {
  // Function-specific keys for this test (not in the always-exposed lists).
  // Use FN_ENV (global) + DOMAIN_NAME (stage) to exercise both sides.
  const fnEnv = [
    'FN_ENV',
    'DOMAIN_NAME',
  ] as const satisfies readonly AllParamsKeys[];

  it('deriveAllKeys returns the exact union set (global ∪ stage ∪ function)', () => {
    const keys = deriveAllKeys(globalEnvKeys, stageEnvKeys, fnEnv);
    expect(keys.size).toBe(5);
    expect(Array.from(keys).sort()).toEqual(
      ['PROFILE', 'SERVICE_NAME', 'STAGE', 'FN_ENV', 'DOMAIN_NAME'].sort(),
    );
  });

  it('splitKeysBySchema partitions keys according to schema key sets', () => {
    const all = deriveAllKeys(globalEnvKeys, stageEnvKeys, fnEnv);
    const { globalPick, stagePick } = splitKeysBySchema(
      all,
      globalParamsSchema,
      stageParamsSchema,
    );

    expect(new Set(globalPick)).toEqual(
      new Set(['SERVICE_NAME', 'PROFILE', 'FN_ENV']),
    );
    expect(new Set(stagePick)).toEqual(new Set(['STAGE', 'DOMAIN_NAME']));
  });

  it('buildEnvSchema composes a schema with exactly the picked keys', () => {
    const all = deriveAllKeys(globalEnvKeys, stageEnvKeys, fnEnv);
    const { globalPick, stagePick } = splitKeysBySchema(
      all,
      globalParamsSchema,
      stageParamsSchema,
    );
    const envSchema = buildEnvSchema(
      globalPick,
      stagePick,
      globalParamsSchema,
      stageParamsSchema,
    );

    expect(envSchema instanceof z.ZodObject).toBe(true);

    const shapeKeys = Object.keys(envSchema.shape);
    expect([...shapeKeys].sort()).toEqual(
      ['PROFILE', 'SERVICE_NAME', 'STAGE', 'FN_ENV', 'DOMAIN_NAME'].sort(),
    );
  });

  it('parseTypedEnv returns the typed env object on success', () => {
    const all = deriveAllKeys(globalEnvKeys, stageEnvKeys, fnEnv);
    const { globalPick, stagePick } = splitKeysBySchema(
      all,
      globalParamsSchema,
      stageParamsSchema,
    );
    const envSchema = buildEnvSchema(
      globalPick,
      stagePick,
      globalParamsSchema,
      stageParamsSchema,
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
    const all = deriveAllKeys(globalEnvKeys, stageEnvKeys, fnEnv);
    const { globalPick, stagePick } = splitKeysBySchema(
      all,
      globalParamsSchema,
      stageParamsSchema,
    );
    const envSchema = buildEnvSchema(
      globalPick,
      stagePick,
      globalParamsSchema,
      stageParamsSchema,
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
