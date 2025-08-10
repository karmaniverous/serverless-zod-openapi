import * as dev from './dev';
import { globalExposedEnvKeys, globalParams } from './global';
import { type GlobalParams, globalParamSchema } from './globalSchema';
import * as prod from './prod';
import { type StageParams } from './stageSchema';
import * as test from './test';

/**
 * Merge the global params with stage‑specific params.  Stage params
 * override global params.  The resulting object is validated against
 * `globalParamSchema` to ensure required values are present.
 */
export const mergeStageParams = (stage: StageParams): GlobalParams => {
  // Merge without using `any`.  Cast the result to GlobalParams for type
  // checking; actual validation happens via Zod below.
  const merged = { ...globalParams, ...stage };
  return globalParamSchema.parse(merged);
};

/** The complete set of parameters for each stage. */
export const stages = {
  default: globalParams,
  dev: mergeStageParams(dev.stageParams),
  prod: mergeStageParams(prod.stageParams),
  test: mergeStageParams(test.stageParams),
};

/**
 * Provider‑level environment variables: for each key in the global
 * exposure list, map it to ${param:<KEY>}.  Serverless will resolve
 * the correct value per stage at deploy time.
 */
export const environment: Record<string, string> = Object.fromEntries(
  globalExposedEnvKeys.map((key) => [key, `\${param:${key}}`]),
);

/**
 * Utility to build a function’s environment object.  Pass the stage
 * name and a list of extra keys (the function’s local exposures),
 * and it returns an object mapping each key to ${param:<KEY>}.
 */
export const buildFunctionEnvironment = (
  stageName: keyof typeof stages,
  additionalKeys: readonly (keyof GlobalParams | keyof StageParams)[] = [],
): Record<string, string> => {
  const stageParams = stages[stageName];
  const keys = new Set([...globalExposedEnvKeys, ...additionalKeys]);
  const entries: [string, string][] = [];
  keys.forEach((key) => {
    if (key in stageParams) {
      entries.push([key as string, `\${param:${key}}`]);
    }
  });
  return Object.fromEntries(entries);
};
