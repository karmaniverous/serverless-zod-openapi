import type { Stage } from '../types';

const stage: Stage = {
  STAGE: 'prod',

  /** esbuild */
  ESB_MINIFY: true,
  ESB_SOURCEMAP: false,
};

export default stage;
