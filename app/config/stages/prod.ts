import type { StageParams } from '../stage';

export const stageParams: StageParams = {
  DOMAIN_CERTIFICATE_ARN:
    'arn:aws:acm:us-east-1:343218212471:certificate/6505cd50-6d57-43f7-a199-02f3e4a08683',
  DOMAIN_NAME: 'api.johngalt.id',
  STAGE: 'prod',
  ESB_MINIFY: true,
  ESB_SOURCEMAP: false,
};
