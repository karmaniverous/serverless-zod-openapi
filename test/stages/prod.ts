import type { StageParams } from './stageSchema';

export const prodStageParams: StageParams = {
  STAGE: 'prod',
  DOMAIN_NAME: 'api.example.test',
  ESB_MINIFY: true,
  ESB_SOURCEMAP: false,
};
