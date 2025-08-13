import type { AWS } from '@serverless/typescript';

import { buildFnEnv } from '@/src/serverless/stages';

import { envKeys } from './env';

const functions: AWS['functions'] = {
  fooGet: {
    handler: 'src/endpoints/foo/get/handler.handler',
    environment: buildFnEnv(envKeys),
    events: [{ http: { method: 'get', path: 'foo' } }],
  },
};

export default functions;
