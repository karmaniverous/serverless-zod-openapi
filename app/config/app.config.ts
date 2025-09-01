import { z } from 'zod';

import { App, baseEventTypeMapSchema } from '@/src';

export const app = App.create({
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
      PROFILE: 'JGS-SSO',
      REGION: 'ap-southeast-1',
      SERVICE_NAME: 'api-johngalt-id',
    },
    envKeys: ['REGION', 'SERVICE_NAME'],
  },
  stage: {
    params: {
      dev: {
        DOMAIN_CERTIFICATE_ARN:
          'arn:aws:acm:us-east-1:343218212471:certificate/8a668260-e9ec-4fde-9b48-d2be8aedb489',
        DOMAIN_NAME: 'api.dev.johngalt.id',
        STAGE: 'dev',
      },
      prod: {
        DOMAIN_CERTIFICATE_ARN:
          'arn:aws:acm:us-east-1:343218212471:certificate/6505cd50-6d57-43f7-a199-02f3e4a08683',
        DOMAIN_NAME: 'api.johngalt.id',
        STAGE: 'prod',
        ESB_MINIFY: true,
        ESB_SOURCEMAP: false,
      },
    },
    envKeys: ['STAGE'],
  },
});
export const { stages, environment, buildFnEnv } = app;
