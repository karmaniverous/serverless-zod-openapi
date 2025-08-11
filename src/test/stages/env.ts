import type { GlobalParams } from './globalSchema';
import type { StageParams } from './stageSchema';

/** Keys from global/stage exposed to every function (test fixture) */
export const globalEnv = [
  'SERVICE_NAME',
  'PROFILE',
] as const satisfies readonly (keyof GlobalParams)[];

export const stageEnv = [
  'STAGE',
] as const satisfies readonly (keyof StageParams)[];
