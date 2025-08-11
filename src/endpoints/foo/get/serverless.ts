import type { AWS } from '@serverless/typescript';

import { buildFunctionEnvironment } from '@/serverless/stages';

import { envKeys } from './env';

const functions: AWS['functions'] = {
  fooGet: {
    handler: 'src/endpoints/foo/get/index.handler',
    environment: buildFunctionEnvironment(envKeys),
    events: [{ http: { method: 'get', path: 'foo' } }],
  },
};

export default functions;
