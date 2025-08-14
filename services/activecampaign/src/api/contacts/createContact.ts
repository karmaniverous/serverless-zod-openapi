import type { AxiosRequestConfig } from 'axios';

import type { ACFieldValue } from '../../wrapped/contacts';
import {
  createContactRaw,
  fetchContactFieldValues,
} from '../../wrapped/contacts';
import { getFieldMaps, materialize } from './helpers';
import { type Contact, CreateContactInputZ } from './schemas';

export const createContact = async (
  rawInput: unknown,
  options?: AxiosRequestConfig,
): Promise<Contact> => {
  const input = CreateContactInputZ.parse(rawInput);

  const maps = await getFieldMaps(options);
  const fieldValues = input.fields
    ? Object.entries(input.fields).flatMap(([name, value]) => {
        const f = maps.byName.get(name);
        return f ? [{ field: f.id, value: String(value) }] : [];
      })
    : [];

  // Build body without undefined keys to satisfy exactOptionalPropertyTypes
  const contactBody: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    fieldValues?: Array<{ field: string | number; value: string }>;
  } = { email: input.email };

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
  const fvals = (fvRes?.fieldValues ?? []);
  return materialize(data.contact, fvals, maps);
};
