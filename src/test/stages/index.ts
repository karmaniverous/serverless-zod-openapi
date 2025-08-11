import { createStagesArtifacts } from '@/serverless/stages/factory';

import { devStageParams } from './dev';
import { globalEnv, stageEnv } from './env';
import { globalParams } from './global';
import { globalParamsSchema } from './globalSchema';
import { prodStageParams } from './prod';
import { stageParamsSchema } from './stageSchema';

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
