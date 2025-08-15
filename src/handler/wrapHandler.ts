import {
  globalEnvKeys,
  globalParamsSchema,
} from '@@/src/serverless/config/stages/global';
import {
  stageEnvKeys,
  stageParamsSchema,
} from '@@/src/serverless/config/stages/stage';

import { makeWrapHandler } from './makeWrapHandler';

export const wrapHandler = makeWrapHandler({
  globalEnvKeys,
  globalParamsSchema,
  stageEnvKeys,
  stageParamsSchema,
});
