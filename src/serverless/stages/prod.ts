import type { StageParams } from './stageSchema';

export const stageParams: StageParams = {
  DOMAIN_CERTIFICATE_ARN:
    'arn:aws:acm:ap-southeast-1:343218212471:certificate/de69b150-3b72-491b-8ad8-c65daa869e87',
  DOMAIN_NAME: 'api.johngalt.id',
  STAGE: 'prod',
  ESB_MINIFY: true,
  ESB_SOURCEMAP: false,
};
