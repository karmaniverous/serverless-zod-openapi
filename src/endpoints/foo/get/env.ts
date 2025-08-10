// src/endpoints/foo/get/env.ts
import type { AllParams } from '@/handler/Handler';

/**
 * Additional config keys needed by this function.  Keys declared here
 * will be exposed only to this function; globally exposed keys remain.
 */
export const envKeys = [
  'TEST_STAGE_ENV',
] as const satisfies readonly (keyof AllParams)[];
