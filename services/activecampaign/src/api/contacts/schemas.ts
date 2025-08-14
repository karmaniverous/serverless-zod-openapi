import { z } from 'zod';

export const ContactZ = z
  .object({
    id: z.string(),
    email: z.string().email().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    // flexible container for custom fields materialized from AC
    fields: z.record(z.unknown()),
  })
  .catchall(z.unknown());

export type Contact = z.infer<typeof ContactZ>;

// Inputs

export const CreateContactInputZ = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  fields: z.record(z.unknown()).optional(),
});
export type CreateContactInput = z.infer<typeof CreateContactInputZ>;

export const UpdateContactInputZ = z.object({
  contactId: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  fields: z.record(z.unknown()).optional(),
});
export type UpdateContactInput = z.infer<typeof UpdateContactInputZ>;

export const ListContactsParamsZ = z.object({
  search: z.string().optional(),
  limit: z.number().int().nonnegative().optional(),
  offset: z.number().int().nonnegative().optional(),
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
