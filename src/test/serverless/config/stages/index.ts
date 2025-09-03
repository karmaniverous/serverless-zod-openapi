import { stagesFactory } from '@/src/serverless/stagesFactory';

import {
  globalEnvKeys,
  globalParams,
  globalParamsSchema,
} from '../global';
import { stageEnvKeys, stageParamsSchema } from '../stage';
import { devStageParams } from './dev';
import { prodStageParams } from './prod';

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