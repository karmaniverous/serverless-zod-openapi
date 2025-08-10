// src/endpoints/foo/get/env.ts
import type { GlobalParams } from '@/serverless/stages/globalSchema';
import type { StageParams } from '@/serverless/stages/stageSchema';

/**
 * Additional config keys needed by this function.  Keys declared here
 * will be exposed only to this function; globally exposed keys remain.
 */
export const envKeys: readonly (keyof GlobalParams | keyof StageParams)[] = [
  'TEST_GLOBAL_ENV',
  'TEST_STAGE_ENV',
];
