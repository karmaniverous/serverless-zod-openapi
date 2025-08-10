import type { StageParams } from './stageSchema';

export const stageParams: StageParams = {
  STAGE: 'prod',

  /** override esbuild settings */
  ESB_MINIFY: true,
  ESB_SOURCEMAP: false,
};

export const stageExposedEnvKeys: (keyof StageParams)[] = [];
