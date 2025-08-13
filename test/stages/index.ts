import { createStagesArtifacts } from '@/src/serverless/stages/factory';

import { devStageParams } from './dev';
import { globalEnv, stageEnv } from './env';
import { globalParams } from './global';
import { type GlobalParams, globalParamsSchema } from './globalSchema';
import { prodStageParams } from './prod';
import { type StageParams, stageParamsSchema } from './stageSchema';

// ✅ export the same type API for tests
export type AllParams = GlobalParams & StageParams;

/** Run the factory with test configs and export the artifacts */
export const { stages, environment, buildFunctionEnvironment } =
  createStagesArtifacts({
    globalParamsSchema,
    stageParamsSchema,
    globalParams,
    globalEnv,
    stageEnv,
    stages: {
      dev: devStageParams,
      prod: prodStageParams,
    },
  });
