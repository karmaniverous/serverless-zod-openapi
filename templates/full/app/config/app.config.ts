import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { App, baseEventTypeMapSchema, toPosixPath } from '@karmaniverous/smoz';
import { z } from 'zod';

// Derive the app root as the parent directory of app/config/
export const APP_ROOT_ABS = toPosixPath(
  fileURLToPath(new URL('..', import.meta.url)),
);

export const app = App.create({
  appRootAbs: APP_ROOT_ABS,
  globalParamsSchema: z.object({
    PROFILE: z.string(),
    REGION: z.string(),
    SERVICE_NAME: z.string(),
  }),
  stageParamsSchema: z.object({
    STAGE: z.string(),
  }),
  eventTypeMapSchema: baseEventTypeMapSchema,
  serverless: {
    httpContextEventMap: {
      my: {}, // place a Cognito authorizer here if needed
      private: { private: true },
      public: {},
    },
    defaultHandlerFileName: 'handler',
    defaultHandlerFileExport: 'handler',
  },
  global: {
    params: {
      PROFILE: 'dev',
      REGION: 'us-east-1',
      SERVICE_NAME: 'my-smoz-app',
    },
    envKeys: ['REGION', 'SERVICE_NAME'] as const,
  },
  stage: {
    params: {
      dev: { STAGE: 'dev' },
    },
    envKeys: ['STAGE'] as const,
  },
});

export const ENDPOINTS_ROOT_REST = toPosixPath(
  join(APP_ROOT_ABS, 'functions', 'rest'),
);
