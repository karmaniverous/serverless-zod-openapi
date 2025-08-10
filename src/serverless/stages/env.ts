import type { GlobalParams } from './globalSchema';
import type { StageParams } from './stageSchema';

/**
 * Keys from GlobalParams exposed to EVERY function via provider.environment.
 * Keep these as a const tuple so we get literal types.
 */
export const globalEnv = [
  'SERVICE_NAME',
  'REGION',
  'PROFILE',
  'TEST_GLOBAL_ENV',
] as const satisfies readonly (keyof GlobalParams)[];

/**
 * Keys from StageParams exposed to EVERY function via provider.environment.
 * Example includes STAGE and any stage-scoped vars you want globally.
 */
export const stageEnv = [
  'STAGE',
] as const satisfies readonly (keyof StageParams)[];
