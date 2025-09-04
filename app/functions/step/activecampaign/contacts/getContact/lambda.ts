/**
 * Registration: Step function to get an ActiveCampaign contact by id.
 */
 
import { join } from 'node:path';

import { z } from 'zod';

import { app } from '@/app/config/app.config';
import { APP_ROOT_ABS } from '@/app/config/app.config';
import { contactSchema } from '@/services/activecampaign/src';
import type { LambdaEvent } from '@/src';

export const eventSchema = z
  .object({
    Payload: z.object({ contactId: z.string() }),
  })
  .transform(() => ({}) as unknown as LambdaEvent);

export const responseSchema = contactSchema.optional();

export const fn = app.defineFunction({
  functionName: 'getContact',
  eventType: 'step',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: join(APP_ROOT_ABS, 'functions', 'step').replace(/\\/g, '/'),
});