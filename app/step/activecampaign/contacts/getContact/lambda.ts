/**
 * Registration: Step function to get an ActiveCampaign contact by id.
 */
import { z } from 'zod';

import { app } from '@/app/config/app.config';
import { ENDPOINTS_ROOT_ABS } from '@/app/endpoints/_root';
import { contactSchema } from '@/services/activecampaign/src';
import type { LambdaEvent } from '@/src';

export const eventSchema = z
  .object({
    Payload: z.object({ contactId: z.string() }),
  })
  .transform(() => ({} as unknown as LambdaEvent));

export const responseSchema = contactSchema.optional();

export const fn = app.defineFunction({
  functionName: 'getContact',
  eventType: 'step',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: ENDPOINTS_ROOT_ABS,
});
