// src/endpoints/foo/get/env.ts
import { buildFunctionEnvironment, type stages } from '@/serverless/stages';
import type { GlobalParams } from '@/serverless/stages/globalSchema';
import type { StageParams } from '@/serverless/stages/stageSchema';

/**
 * Additional config keys needed by this function.  Keys declared here
 * will be exposed only to this function; globally exposed keys remain.
 */
export const envKeys: readonly (keyof GlobalParams | keyof StageParams)[] = [];

/**
 * Compute the environment object for this function.
 */
export const getFunctionEnvironment = (stage: keyof typeof stages) =>
  buildFunctionEnvironment(stage, envKeys);
