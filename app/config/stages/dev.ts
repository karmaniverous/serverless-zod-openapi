import type { StageParams } from '../stage';

/**
 * Stage configuration for “dev”.  Only differences from global values
 * need to be specified.
 */
export const stageParams: StageParams = {
  DOMAIN_CERTIFICATE_ARN:
    'arn:aws:acm:us-east-1:343218212471:certificate/8a668260-e9ec-4fde-9b48-d2be8aedb489',
  DOMAIN_NAME: 'api.dev.johngalt.id',
  STAGE: 'dev',
};
