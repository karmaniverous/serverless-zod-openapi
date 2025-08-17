/**
 * REQUIREMENTS ADDRESSED
 * - Use makeWrapHandler directly with local config; eliminate wrapHandler.
 * - Pass event type argument ('http') so HTTP middleware is applied.
 * - Do not use deprecated Zod 4 functions.
 */
import type { z } from 'zod';

import { makeWrapHandler } from '@@/lib/handler/makeWrapHandler';
import { globalEnvKeys, globalParamsSchema } from '@@/src/config/global';
import { stageEnvKeys, stageParamsSchema } from '@@/src/config/stage';
import openapi from '@@/src/openapi.json';

import { functionConfig, type responseSchema } from './config';

const wrap = makeWrapHandler({
  globalEnvKeys,
  globalParamsSchema,
  stageEnvKeys,
  stageParamsSchema,
});

export const handler = wrap('http')(
  async () => openapi as unknown as z.infer<typeof responseSchema>,
  functionConfig,
);
