import { stagesFactory } from '@/src';

import {
  globalEnvKeys,
  type GlobalParams,
  globalParams,
  globalParamsSchema,
} from '../global';
import { stageEnvKeys, type StageParams, stageParamsSchema } from '../stage';
import * as dev from './dev';
import * as prod from './prod';

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
