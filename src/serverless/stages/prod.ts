import type { StageParams } from './stageSchema';

export const stageParams: StageParams = {
  STAGE: 'prod',

  /** override esbuild settings */
  ESB_MINIFY: true,
  ESB_SOURCEMAP: false,

  /**
   * Stage-specific param not exposed as an env var.
   */
  TEST_STAGE: 'stage-prod',

  /**
   * Stage-specific param exposed as an env var.
   */
  TEST_STAGE_ENV: 'stage-prod-env',
};

export const stageExposedEnvKeys: (keyof StageParams)[] = [];
