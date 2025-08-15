import type { AWS } from '@serverless/typescript';

import { buildFnEnv } from '@@/src/serverless/config/stages';

import { fnEnvKeys } from './env';

const functions: AWS['functions'] = {
  fooGet: {
    handler: 'src/endpoints/foo/get/handler.handler',
    environment: buildFnEnv(fnEnvKeys),
    events: [{ http: { cors: true, method: 'get', path: 'foo' } }],
  },
};

export default functions;
