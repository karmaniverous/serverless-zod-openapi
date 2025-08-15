import type { AWS } from '@serverless/typescript';

import { modulePathFromRoot } from '@@/src/modulePathFromRoot';
import { buildFnEnv } from '@@/src/serverless/config/stages';

import { fnEnvKeys } from './env';

const functions: AWS['functions'] = {
  eventActivecampaignPost: {
    handler: `${modulePathFromRoot(import.meta.url)}/handler.handler`,
    environment: buildFnEnv(fnEnvKeys),
    events: [
      { http: { cors: true, method: 'post', path: 'event/activecampaign' } },
    ],
  },
};

export default functions;
