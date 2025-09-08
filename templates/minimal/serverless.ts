import type { AWS } from '@serverless/typescript';

import { app } from '@/app/config/app.config';
/**
 * Template note:
 * - Templates do NOT commit generated register files under app/generated; they
 *   are declared via ambient types (templates/minimal/types/registers.d.ts) so
 *   TypeScript can typecheck without artifacts.
 * - To ensure side effects still run (endpoint/serverless registration) and to
 *   satisfy noUncheckedSideEffectImports, import register modules as namespaces
 *   and reference them via `void`.
 * - In real apps, `smoz init` seeds placeholders and `smoz register` rewrites
 *   app/generated/register.*.ts at author time.
 */
import * as __register_functions from '@/app/generated/register.functions';
import * as __register_serverless from '@/app/generated/register.serverless';
void __register_functions;
void __register_serverless;

const config: AWS = {
  service: '${param:SERVICE_NAME}',
  frameworkVersion: '4',
  stages: app.stages as NonNullable<AWS['stages']>,
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
