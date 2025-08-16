import { globalEnvKeys, globalParamsSchema } from '@@/src/config/global';
import { stageEnvKeys, stageParamsSchema } from '@@/src/config/stage';

import { makeWrapHandler } from './makeWrapHandler';

export const wrapHandler = makeWrapHandler({
  globalEnvKeys,
  globalParamsSchema,
  stageEnvKeys,
  stageParamsSchema,
});
