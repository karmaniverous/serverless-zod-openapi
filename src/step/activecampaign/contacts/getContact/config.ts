/**
 * REQUIREMENTS ADDRESSED
 * - Non-HTTP config: declare Step Function event type; HTTP keys not allowed.
 * - Include eventSchema & responseSchema; no casts.
 * - Use global/stage param schemas from production config and as types.
 */

import { z } from 'zod';

import { makeFunctionConfig } from '@@/lib/handler/makeFunctionConfig';
import type { LambdaEvent } from '@@/lib/types/LambdaEvent';
import { contactSchema } from '@@/services/activecampaign/src';
import type { globalParamsSchema } from '@@/src/config/global';
import type { stageParamsSchema } from '@@/src/config/stage';

export const eventSchema = z
  .looseObject({
    Payload: z.object({ contactId: z.string() }),
  })
  .catchall(z.unknown());

export const responseSchema = contactSchema.optional();

export const functionConfig = makeFunctionConfig<
  LambdaEvent,
  typeof eventSchema,
  typeof responseSchema,
  typeof globalParamsSchema,
  typeof stageParamsSchema
>({
  functionName: 'getContact',
  // no HTTP keys here
  eventSchema,
  responseSchema,
});
