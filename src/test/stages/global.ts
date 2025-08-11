import type { GlobalParams } from './globalSchema';

/** Test-only global params */
export const globalParams: GlobalParams = {
  ESB_MINIFY: false,
  ESB_SOURCEMAP: true,
  FN_ENV: 'test',
  PROFILE: 'dev',
  REGION: 'us-east-1',
  SERVICE_NAME: 'svc-test',
};
