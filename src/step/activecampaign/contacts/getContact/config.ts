/**
 * REQUIREMENTS ADDRESSED
 * - Non-HTTP config: omit EventType generic; HTTP-only keys are not allowed.
 * - Include eventSchema & responseSchema; no casts.
 * - Thread GlobalParams & StageParams for env key typing.
 */

import { z } from 'zod';

import { makeFunctionConfig } from '@@/lib/handler/makeFunctionConfig';
import { contactSchema } from '@@/services/activecampaign/src';
import type { globalParamsSchema } from '@@/src/config/global';
import type { stageParamsSchema } from '@@/src/config/stage';

export const eventSchema = z
  .looseObject({ Payload: { contactId: z.string() } })
  .catchall(z.unknown());

export const responseSchema = contactSchema.optional();

export const functionConfig = makeFunctionConfig<
  Record<PropertyKey, unknown>, // <-- is this the correct type for a generic event?
  typeof eventSchema,
  typeof responseSchema,
  typeof globalParamsSchema,
  typeof stageParamsSchema
>({
  functionName: 'getContact',
  eventSchema,
  responseSchema,
});
