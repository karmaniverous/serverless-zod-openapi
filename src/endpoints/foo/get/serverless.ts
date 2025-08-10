import type { AWS } from '@serverless/typescript';

import { buildFunctionEnvironment, type stages } from '@/serverless/stages';

import { envKeys } from './env';

// compute environment using the current stage; you could read from
// process.env.STAGE or default to 'dev'
const stage = process.env.STAGE as keyof typeof stages;

const functions: AWS['functions'] = {
  fooGet: {
    handler: 'src/endpoints/foo/get/index.handler',
    environment: buildFunctionEnvironment(stage, envKeys),
    events: [{ http: { method: 'get', path: 'foo' } }],
  },
};

export default functions;
