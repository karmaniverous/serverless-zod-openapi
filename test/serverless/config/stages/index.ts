import { stagesFactory } from '@@/src/serverless/stagesFactory';

import { devStageParams } from './dev';
import {
  globalEnvKeys,
  type GlobalParams,
  globalParams,
  globalParamsSchema,
} from './global';
import { prodStageParams } from './prod';
import { stageEnvKeys, type StageParams, stageParamsSchema } from './stage';

export type AllParams = GlobalParams & StageParams;
export type AllParamsKeys = keyof AllParams;

/** Run the factory with test configs and export the artifacts */
export const { stages, environment, buildFnEnv } = stagesFactory({
  globalParamsSchema,
  stageParamsSchema,
  globalParams,
  globalEnvKeys,
  stageEnvKeys,
  stages: {
    dev: devStageParams,
    prod: prodStageParams,
  },
});
