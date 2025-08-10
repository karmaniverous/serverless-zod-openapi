import type { StageParams } from './stageSchema';

export const stageParams: StageParams = {
  STAGE: 'prod',
  ESB_MINIFY: true,
  ESB_SOURCEMAP: false,
  TEST_STAGE: 'stage-prod',
  TEST_STAGE_ENV: 'stage-prod-env',
};
