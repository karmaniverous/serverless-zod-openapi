import type { StageParams } from '../stage';

export const devStageParams: StageParams = {
  STAGE: 'dev',
  DOMAIN_NAME: 'api.dev.example.test',
  DOMAIN_CERTIFICATE_ARN:
    'arn:aws:acm:us-east-1:000000000000:certificate/dev-cert',
};