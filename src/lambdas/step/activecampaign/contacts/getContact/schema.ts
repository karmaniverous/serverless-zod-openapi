import { z } from 'zod';

import { contactSchema } from '@@/services/activecampaign/src';

export const eventSchema = z.object({
  body: z.object({
    contactId: z.string(),
  }),
});

export const responseSchema = contactSchema.optional();
