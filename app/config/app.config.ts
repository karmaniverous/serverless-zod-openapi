import { z } from 'zod';

import { App, baseEventTypeMapSchema } from '@/src';

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

// Event type map schema — extend base with project-local tokens (e.g., 'step')
export const eventTypeMapSchema = baseEventTypeMapSchema.extend({
  step: z.custom<Record<string, unknown>>(),
});

export const app = App.create({
  globalParamsSchema,
  stageParamsSchema,
  eventTypeMapSchema,
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
  // HTTP tokens (runtime decision). Default is ['rest','http']; override if desired.
  // httpEventTypeTokens: ['rest', 'http'],
});

export const { stages, environment, buildFnEnv } = app;