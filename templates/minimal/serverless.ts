import type { AWS } from '@serverless/typescript';
import { app } from '@/app/config/app.config';
import '@/app/generated/register.functions';
import '@/app/generated/register.serverless';

const config: AWS = {
  service: '${param:SERVICE_NAME}',
  frameworkVersion: '4',
  stages: app.stages,
  provider: {
    name: 'aws',
    region: '${param:REGION}' as NonNullable<AWS['provider']['region']>,
    runtime: 'nodejs22.x',
    environment: app.environment as NonNullable<AWS['provider']['environment']>,
    stage: '${opt:stage, "dev"}',
  },
  functions: app.buildAllServerlessFunctions() as NonNullable<AWS['functions']>,
};

export default config;