import type { AxiosRequestConfig } from 'axios';
import { z } from 'zod';

import { syncContactRaw } from '../../wrapped/contacts';
import { cacheConfig } from '../config';
import { getContact } from './getContact';
import { type Contact } from './schemas';

/** Function-specific schema & type */
export const updateContactInputSchema = z.object({
  contactId: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  /** Direct field-id keyed updates (business layer keeps it simple) */
  fields: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateContactInput = z.infer<typeof updateContactInputSchema>;

export const updateContact = async (
  rawInput: unknown,
  options?: AxiosRequestConfig,
): Promise<Contact | undefined> => {
  const input = updateContactInputSchema.parse(rawInput);

  const current = await getContact(input.contactId, options);
  if (!current?.email) return current;

  const bodyContact: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    fieldValues?: Array<{ field: string | number; value: string }>;
  } = { email: current.email };

  if (input.firstName !== undefined) bodyContact.firstName = input.firstName;
  if (input.lastName !== undefined) bodyContact.lastName = input.lastName;
  if (input.phone !== undefined) bodyContact.phone = input.phone;

  if (input.fields) {
    bodyContact.fieldValues = Object.entries(input.fields).map(
      ([field, value]) => ({
        field,
        value: String(value),
      }),
    );
  }

  await syncContactRaw(
    { contact: bodyContact },
    // invalidate this contact + any lists (aligns with wrapped tag scheme)
    [
      cacheConfig.contacts.detail.tag(input.contactId),
      cacheConfig.contacts.list.any.tag(),
    ],
    options,
  );

  return getContact(input.contactId, options);
};
