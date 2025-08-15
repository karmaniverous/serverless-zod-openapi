import { z } from 'zod';

export const eventSchema = z
  .object({
    body: z.string(), // z.object({}).loose(),
  })
  .meta({ ref: 'EventActivecampaignGetEvent' });

export const responseSchema = z
  .string()
  .meta({ ref: 'EventActivecampaignGetResponse' });
