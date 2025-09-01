/**
 * REQUIREMENTS ADDRESSED
 * - Non-HTTP config: eventType='step'; HTTP keys not allowed.
 * - Include eventSchema & responseSchema; rely on inference (no generics).
 */
import { z } from 'zod';

import { contactSchema } from '@/services/activecampaign/src';
import type { LambdaEvent } from '@/src';
import { defineFunctionConfig } from '@/src';

export const eventSchema = z
  .object({    Payload: z.object({
      contactId: z.string(),
    }),
  })
  .transform((input) => input as unknown as LambdaEvent);

export const responseSchema = contactSchema.optional();

export const functionConfig = defineFunctionConfig({
  eventType: 'step',
  functionName: 'getContact',
  eventSchema,  responseSchema,
});
