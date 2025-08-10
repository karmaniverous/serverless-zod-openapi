import type { StageParams } from './stageSchema';

/**
 * Stage configuration for “dev”.  Only differences from global values
 * need to be specified.
 */
export const stageParams: StageParams = {
  STAGE: 'dev',
  TEST_STAGE: 'stage-dev',
  TEST_STAGE_ENV: 'stage-dev-env',
};
