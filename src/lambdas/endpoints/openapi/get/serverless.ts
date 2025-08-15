import type { AWS } from '@serverless/typescript';

import { modulePathFromRoot } from '@@/src/modulePathFromRoot';
import { buildFnEnv } from '@@/src/serverless/config/stages';

import { fnEnvKeys } from './env';

const functions: AWS['functions'] = {
  openapiGet: {
    handler: `${modulePathFromRoot(import.meta.url)}/handler.handler`,
    environment: buildFnEnv(fnEnvKeys),
    events: [{ http: { cors: true, method: 'get', path: 'openapi' } }],
  },
};

export default functions;
