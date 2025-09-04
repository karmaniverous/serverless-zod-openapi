import '@/app/functions/rest/hello/get/lambda';
import '@/app/functions/rest/hello/get/openapi';

import type { AWS } from '@serverless/typescript';

import { app, environment, stages } from '@/app/config/app.config';

const config: AWS = {
  service: '${param:SERVICE_NAME}',
  frameworkVersion: '4',
  stages,
  provider: {
    name: 'aws',
    region: '${param:REGION}' as NonNullable<AWS['provider']['region']>,
    runtime: 'nodejs22.x',
    environment,
    stage: '${opt:stage, "dev"}',
  },
  functions: app.buildAllServerlessFunctions() as NonNullable<AWS['functions']>,
};

export default config;
