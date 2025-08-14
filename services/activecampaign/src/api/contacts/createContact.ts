import type { AxiosRequestConfig } from '@karmaniverous/cached-axios';
import { z } from 'zod';

import {
  createContactRaw,
  fetchContactFieldValues,
} from '../../wrapped/contacts';
import { getFieldMaps, materialize } from './helpers';
import { type Contact } from './schemas';

/** Function-specific schema & type */
export const createContactInputSchema = z.object({
  email: z.email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  /** Named, user-facing custom fields to map into AC field ids */
  fields: z.record(z.string(), z.unknown()).optional(),
});
export type CreateContactInput = z.infer<typeof createContactInputSchema>;

export const createContact = async (
  rawInput: unknown,
  options?: AxiosRequestConfig,
): Promise<Contact> => {
  const input = createContactInputSchema.parse(rawInput);

  const maps = await getFieldMaps(options);

  const contactBody: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    fieldValues?: Array<{ field: string | number; value: string }>;
  } = { email: input.email };

  // Build AC field values from user-supplied named fields
  const fieldValues: Array<{ field: string | number; value: string }> = [];
  for (const [name, value] of Object.entries(input.fields ?? {})) {
    const meta = maps.byName.get(name);
    if (!meta) continue;
    fieldValues.push({ field: meta.id, value: String(value) });
  }

  if (input.firstName !== undefined) contactBody.firstName = input.firstName;
  if (input.lastName !== undefined) contactBody.lastName = input.lastName;
  if (input.phone !== undefined) contactBody.phone = input.phone;
  if (fieldValues.length) contactBody.fieldValues = fieldValues;

  const { data } = await createContactRaw({ contact: contactBody }, options);

  // Fetch field values and materialize with catalog for a consistent shape
  const { data: fvRes } = await fetchContactFieldValues(
    Number(data.contact.id),
    options,
  );
  const fvals = fvRes.fieldValues;
  return materialize(data.contact, fvals, maps);
};
