import type { AxiosRequestConfig } from '@karmaniverous/cached-axios';
import { z } from 'zod';

import { syncContactRaw } from '../../wrapped/contacts';
import { getContact } from './getContact';
import { type Contact } from './schemas';
import type { SyncContactDataRequest } from '../../../generated/api.schemas';

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
  input: UpdateContactInput,
  options?: AxiosRequestConfig,
): Promise<Contact | undefined> => {
  // Load the current contact for defaults (email is required by sync API)
  const current = await getContact(input.contactId, options);
  if (!current) return undefined;

  // Build the sync payload that satisfies generated typings
  const bodyContact: SyncContactDataRequest['contact'] = {
    email: current.email ?? '',
    firstName: input.firstName ?? current.firstName ?? '',
    lastName: input.lastName ?? current.lastName ?? '',
    phone: input.phone ?? current.phone ?? '',
    fieldValues: [],
  };

  // Apply field id keyed updates (values cast to string per AC API)
  if (input.fields) {
    for (const [fieldId, val] of Object.entries(input.fields)) {
      bodyContact.fieldValues.push({
        field: String(fieldId),
        value: String(val),
      });
    }
  }

  await syncContactRaw({ contact: bodyContact }, options);

  return getContact(input.contactId, options);
};
