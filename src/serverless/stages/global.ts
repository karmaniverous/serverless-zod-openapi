import type { GlobalParams } from './globalSchema';

/**
 * All globally defined parameters.  These values can be overridden
 * in stage files.
 */
export const globalParams: GlobalParams = {
  SERVICE_NAME: 'api-johngalt-id',
  REGION: 'ap-southeast-1',
  PROFILE: 'JGS-SSO',

  /** esbuild defaults */
  ESB_MINIFY: false,
  ESB_SOURCEMAP: true,

  /**
   * Global param not exposed as an env var.
   */
  TEST_GLOBAL: 'stage-global',

  /**
   * Global param exposed as an env var.
   */
  TEST_GLOBAL_ENV: 'stage-global-env',
};

/**
 * A list of keys from globalParams that should be exposed to every
 * function via the provider’s environment.  Keys not listed here
 * remain available in params but are not automatically added to the
 * environment.
 */
export const globalExposedEnvKeys: (keyof GlobalParams)[] = [
  'SERVICE_NAME',
  'REGION',
  'PROFILE',
  'TEST_GLOBAL_ENV',
];
