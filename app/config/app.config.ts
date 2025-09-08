import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { App, baseEventTypeMapSchema, toPosixPath } from '@/src';

// Derive the app root as the parent directory of app/config/
export const APP_ROOT_ABS = toPosixPath(
  fileURLToPath(new URL('..', import.meta.url)),
);

export const app = App.create({
  appRootAbs: APP_ROOT_ABS,
  globalParamsSchema: z.object({
    ESB_MINIFY: z.boolean(),
    ESB_SOURCEMAP: z.boolean(),
    PROFILE: z.string(),
    REGION: z.string(),
    SERVICE_NAME: z.string(),
  }),
  stageParamsSchema: z.object({
    DOMAIN_CERTIFICATE_ARN: z.string(),
    DOMAIN_NAME: z.string(),
    STAGE: z.string(),
  }),
  eventTypeMapSchema: baseEventTypeMapSchema.extend({
    step: z.custom<Record<string, unknown>>(),
  }),
  serverless: {
    httpContextEventMap: {
      my: {
        authorizer: {
          arn: '${param:COGNITO_USER_POOL_ARN}',
          name: 'UserPoolAuthorizer',
          type: 'COGNITO_USER_POOLS',
        },
      },
      private: { private: true },
      public: {},
    },
    defaultHandlerFileName: 'handler',
    defaultHandlerFileExport: 'handler',
  },
  global: {
    params: {
      ESB_MINIFY: false,
      ESB_SOURCEMAP: true,
      PROFILE: 'dev',
      REGION: 'us-east-1',
      SERVICE_NAME: 'smoz-sample',
    },
    envKeys: ['REGION', 'SERVICE_NAME'],
  },
  stage: {
    params: {
      dev: {
        DOMAIN_CERTIFICATE_ARN:
          'arn:aws:acm:us-east-1:000000000000:certificate/dev-placeholder',
        DOMAIN_NAME: 'api.dev.example.test',
        STAGE: 'dev',
      },
      prod: {
        DOMAIN_CERTIFICATE_ARN:
          'arn:aws:acm:us-east-1:000000000000:certificate/prod-placeholder',
        DOMAIN_NAME: 'api.example.test',
        STAGE: 'prod',
        ESB_MINIFY: true,
        ESB_SOURCEMAP: false,
      },
    },
    envKeys: ['STAGE'],
  },
});
export const { stages, environment, buildFnEnv } = app;
