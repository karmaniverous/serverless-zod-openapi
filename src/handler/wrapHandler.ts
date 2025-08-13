import {
  globalEnvKeys,
  globalParamsSchema,
} from '@/src/serverless/stages/global';
import { stageEnvKeys, stageParamsSchema } from '@/src/serverless/stages/stage';

import { makeWrapHandler } from './makeWrapHandler';

export const wrapHandler = makeWrapHandler({
  globalEnvKeys,
  globalParamsSchema,
  stageEnvKeys,
  stageParamsSchema,
});
