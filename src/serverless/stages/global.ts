import type { GlobalParams } from './globalSchema';

/**
 * All globally defined parameters.  These values can be overridden
 * in stage files.
 */
export const globalParams: GlobalParams = {
  ESB_MINIFY: false,
  ESB_SOURCEMAP: true,
  PROFILE: 'JGS-SSO',
  REGION: 'ap-southeast-1',
  SERVICE_NAME: 'api-johngalt-id',
};
