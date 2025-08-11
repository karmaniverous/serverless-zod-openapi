import type { StageParams } from './stageSchema';

/**
 * Stage configuration for “dev”.  Only differences from global values
 * need to be specified.
 */
export const stageParams: StageParams = {
  DOMAIN_CERTIFICATE_ARN:
    'arn:aws:acm:ap-southeast-1:343218212471:certificate/f72de5c4-d317-483f-810f-5a74f7a71e94',
  DOMAIN_NAME: 'api.dev.johngalt.id',
  STAGE: 'dev',
};
