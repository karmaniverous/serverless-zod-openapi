/**
 * REQUIREMENTS ADDRESSED
 * - Use makeWrapHandler directly with local config; eliminate wrapHandler.
 * - Pass event type argument ('internal') so no HTTP middleware is applied.
 * - Do not use deprecated Zod 4 functions.
 */
import { makeWrapHandler } from '@@/lib/handler/makeWrapHandler';
import { getContact } from '@@/services/activecampaign/src';
import { globalEnvKeys, globalParamsSchema } from '@@/src/config/global';
import { stageEnvKeys, stageParamsSchema } from '@@/src/config/stage';

import { functionConfig } from './config';

const wrap = makeWrapHandler({
  globalEnvKeys,
  globalParamsSchema,
  stageEnvKeys,
  stageParamsSchema,
});

export const handler = wrap('internal')(
  (event) => getContact({ contactId: event.Payload.contactId }),
  functionConfig,
);
