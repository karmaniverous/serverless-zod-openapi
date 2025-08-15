import { stagesFactory } from '@@/src/serverless/stagesFactory';

import * as dev from './dev';
import {
  globalEnvKeys,
  type GlobalParams,
  globalParams,
  globalParamsSchema,
} from './global';
import * as prod from './prod';
import { stageEnvKeys, type StageParams, stageParamsSchema } from './stage';

export type AllParams = GlobalParams & StageParams;
export type AllParamsKeys = keyof AllParams;

export const { stages, environment, buildFnEnv } = stagesFactory({
  globalParamsSchema,
  stageParamsSchema,
  globalParams,
  globalEnvKeys,
  stageEnvKeys,
  stages: {
    dev: dev.stageParams,
    prod: prod.stageParams,
  },
});
