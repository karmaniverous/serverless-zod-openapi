import type { StageParams } from './stageSchema';

export const stageParams: StageParams = {
  STAGE: 'test',

  /**
   * Stage-specific param not exposed as an env var.
   */
  TEST_STAGE: 'stage-test',

  /**
   * Stage-specific param exposed as an env var.
   */
  TEST_STAGE_ENV: 'stage-test-env',
};

export const stageExposedEnvKeys: (keyof StageParams)[] = [];
