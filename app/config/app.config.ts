import { defineAppConfig } from '@/src';

import {
  globalEnvKeys,
  type GlobalParams,
  globalParams,
  globalParamsSchema,
} from './global';
import { serverlessConfig } from './serverlessConfig';
import { stageEnvKeys, type StageParams, stageParamsSchema } from './stage';
import * as dev from './stages/dev';
import * as prod from './stages/prod';

export const app = defineAppConfig(globalParamsSchema, stageParamsSchema, {
  serverless: serverlessConfig,
  global: {
    params: globalParams,
    envKeys: globalEnvKeys as readonly (keyof GlobalParams)[],
  },
  stage: {
    params: {
      dev: dev.stageParams,
      prod: prod.stageParams,
    } as Record<string, StageParams>,
    envKeys: stageEnvKeys as readonly (keyof StageParams)[],
  },
});

export const { serverless, stages, environment, buildFnEnv, global, stage } =
  app;

// Wrapper input (schemas + envKeys)
export const envConfig = {
  global: { paramsSchema: globalParamsSchema, envKeys: global.envKeys },
  stage: { paramsSchema: stageParamsSchema, envKeys: stage.envKeys },
} as const;
