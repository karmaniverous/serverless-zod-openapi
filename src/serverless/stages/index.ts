import { diff, unique } from 'radash';

import type { AllParams } from '@/handler/Handler';

import * as dev from './dev';
import { globalEnv, stageEnv } from './env';
import { globalParams } from './global';
import { globalParamsSchema } from './globalSchema';
import * as prod from './prod';
import type { StageParams } from './stageSchema';
import * as test from './test';

// Validate that every stage + global together satisfies required GLOBAL keys.
// This is validation-only: we don't emit the merged object anywhere.
const validateStageGlobals = (s: StageParams) => {
  globalParamsSchema.strip().parse({ ...globalParams, ...s });
};

[dev.stageParams, prod.stageParams, test.stageParams].forEach(
  validateStageGlobals,
);

// What Serverless actually needs for `params`:
// - default: full global defaults
// - per-stage: ONLY overrides + stage-only keys (exactly your stage files)
export const stages = {
  default: globalParams,
  dev: dev.stageParams,
  prod: prod.stageParams,
  test: test.stageParams,
};

/**
 * Provider‑level environment variables: for each key in the global
 * exposure list, map it to ${param:<KEY>}.  Serverless will resolve
 * the correct value per stage at deploy time.
 */
export const environment: Record<string, string> = Object.fromEntries(
  [...globalEnv, ...stageEnv].map((k) => [k, `\${param:${k}}`]),
);

/**
 * Utility to build a function’s environment object.  Pass the stage
 * name and a list of extra keys (the function’s local exposures),
 * and it returns an object mapping each key to ${param:<KEY>}.
 */
const globallyExposed = unique([...globalEnv, ...stageEnv]);

export const buildFunctionEnvironment = (
  additionalKeys: readonly (keyof AllParams)[] = [],
): Record<string, string> => {
  // Only include keys NOT already exposed globally
  const functionOnly = diff(additionalKeys, globallyExposed);

  // Map each key to ${param:KEY}; Serverless will resolve from default+stage
  return Object.fromEntries(functionOnly.map((k) => [k, `\${param:${k}}`]));
};
