import { z } from 'zod';

export const ContactZ = z
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

export type Contact = z.infer<typeof ContactZ>;

export const ListContactsParamsZ = z.object({
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
  email: z.email().optional(),
  phone: z.string().optional(),
  tag: z.string().optional(),
  listId: z.union([z.string(), z.number()]).optional(),
  customFieldFilter: z
    .object({
      name: z.string(),
      value: z.string(),
    })
    .optional(),
});
export type ListContactsParams = z.infer<typeof ListContactsParamsZ>;

export const ListContactsResultZ = z.object({
  contacts: z.array(ContactZ),
  total: z.number().int().nonnegative().optional(),
});
export type ListContactsResult = z.infer<typeof ListContactsResultZ>;
