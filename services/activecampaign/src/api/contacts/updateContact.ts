import type { AxiosRequestConfig } from 'axios';

import { syncContactRaw } from '../../wrapped/contacts';
import { cacheConfig } from '../config';
import { getContact } from './getContact';
import { type Contact,UpdateContactInputZ } from './schemas';

export const updateContact = async (
  rawInput: unknown,
  options?: AxiosRequestConfig,
): Promise<Contact | undefined> => {
  const input = UpdateContactInputZ.parse(rawInput);

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
    // Defer mapping to wrapped layer? We keep business layer simple:
    // We rely on wrapped.sync to accept fieldValues; if missing, wrapped ignores.
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
