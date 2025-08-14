import { z } from 'zod';

export const contactSchema = z
  .object({
    id: z.string(),
    email: z.email().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    // flexible container for custom fields materialized from AC
    fields: z.record(z.string(), z.unknown()),
  })
  .catchall(z.unknown());

export type Contact = z.infer<typeof contactSchema>;
