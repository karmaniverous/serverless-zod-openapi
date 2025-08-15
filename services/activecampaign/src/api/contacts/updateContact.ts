import type { AxiosRequestConfig } from '@karmaniverous/cached-axios';
import { z } from 'zod';

import type { SyncContactDataRequest } from '@/generated/api.schemas';
import { syncContactRaw } from '@/src/wrapped/contacts';
import type { Optionalize } from '@@/src/types/Optionalize';

import { getContact } from './getContact';
import { contactSchema } from './schemas';

/** Function-specific schema & type */
export const updateContactParamsSchema = z.object({
  contactId: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  /** Direct field-id keyed updates (business layer keeps it simple) */
  fields: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateContactParams = z.infer<typeof updateContactParamsSchema>;

export const updateContactOutputSchema = contactSchema.optional();
export type UpdateContactOutput = z.infer<typeof updateContactOutputSchema>;

export const updateContact = async (
  params: Optionalize<UpdateContactParams>,
  options?: AxiosRequestConfig,
): Promise<UpdateContactOutput> => {
  const input = updateContactParamsSchema.parse(params);

  // Load the current contact for defaults (email is required by sync API)
  const current = await getContact({ contactId: input.contactId }, options);
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
        field: fieldId,
        value: String(val),
      });
    }
  }

  await syncContactRaw({ contact: bodyContact }, options);

  return getContact({ contactId: input.contactId }, options);
};
