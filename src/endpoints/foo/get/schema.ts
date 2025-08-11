import { z } from 'zod';

export const eventSchema = z
  .object({
    queryStringParameters: z.object({
      what: z.string().optional(),
      answer: z.number().min(42).max(42).optional(),
    }),
  })
  .meta({ ref: 'FooGetEvent' });

export const responseSchema = z
  .object({
    what: z.string(),
  })
  .meta({ ref: 'FooGetResponse' });
