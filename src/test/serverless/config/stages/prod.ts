import type { StageParams } from '../stage';

export const prodStageParams: StageParams = {
  STAGE: 'prod',
  DOMAIN_NAME: 'api.example.test',
  DOMAIN_CERTIFICATE_ARN:
    'arn:aws:acm:us-east-1:000000000000:certificate/prod-cert',
};
