import type { GlobalParams } from './globalSchema';

/**
 * All globally defined parameters.  These values can be overridden
 * in stage files.
 */
export const globalParams: GlobalParams = {
  SERVICE_NAME: 'api-johngalt-id',
  REGION: 'ap-southeast-1',
  PROFILE: 'JGS-SSO',
  ESB_MINIFY: false,
  ESB_SOURCEMAP: true,
  TEST_GLOBAL: 'stage-global',
  TEST_GLOBAL_ENV: 'stage-global-env',
};
