import type { Stage } from '../types';

const stage: Stage = {
  SERVICE_NAME: 'api-johngalt-id',
  REGION: 'ap-southeast-1',
  PROFILE: 'JGS-SSO',

  /** esbuild */
  ESB_MINIFY: false,
  ESB_SOURCEMAP: true,
};

export default stage;
