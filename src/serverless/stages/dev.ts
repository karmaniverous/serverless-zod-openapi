import type { StageParams } from './stageSchema';

/**
 * Stage configuration for “dev”.  Only differences from global values
 * need to be specified.
 */
export const stageParams: StageParams = {
  STAGE: 'dev',
};

// no additional env keys exposed at this stage
export const stageExposedEnvKeys: (keyof StageParams)[] = [];
