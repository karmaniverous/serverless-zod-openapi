import type { StageParams } from './stageSchema';

/**
 * Stage configuration for “dev”.  Only differences from global values
 * need to be specified.
 */
export const stageParams: StageParams = {
  STAGE: 'dev',

  /**
   * Stage-specific param not exposed as an env var.
   */
  TEST_STAGE: 'stage-dev',

  /**
   * Stage-specific param exposed as an env var.
   */
  TEST_STAGE_ENV: 'stage-dev-env',
};

// no additional env keys exposed at this stage
export const stageExposedEnvKeys: (keyof StageParams)[] = [];
