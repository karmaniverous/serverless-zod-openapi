import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { withMutation, withQuery } from 'axios';

import { getContacts } from '../../generated/contacts/contacts';
import * as ContactsZ from '../../generated/contacts/contacts.zod';
import { cacheConfig } from '../api/config';
import { acDefaults } from '../http';

const contacts = getContacts();

/** Minimal shapes we care about */
export type ACContact = {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  [k: string]: unknown;
};

export type ACFieldValue = {
  id: string;
  contact: string;
  field: string;
  value: string;
};

/** Detail (core) */
export const fetchContactCore = async (
  contactId: string,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ contact: ACContact }>> => {
  ContactsZ.getContactbyIDParams.parse({ contactId });
  const id = cacheConfig.contacts.detail.id(contactId);
  const tags = [
    cacheConfig.contacts.detail.tag(contactId),
    cacheConfig.contacts.list.any.tag(),
  ];
  return withQuery(
    (opts) =>
      contacts.getContactbyID(contactId, {
        ...acDefaults(),
        ...options,
        ...opts,
      }),
    id,
    tags,
    { ...acDefaults(), ...(options ?? {}) },
  );
};

/** Field values for a contact */
export const fetchContactFieldValues = async (
  contactId: number,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ fieldValues: ACFieldValue[] }>> => {
  ContactsZ.getContactFieldValuesParams.parse({ contactId });
  const id = cacheConfig.contacts.detail.id(String(contactId)); // share the detail id bucket
  const tags = [
    cacheConfig.contacts.detail.tag(String(contactId)),
    cacheConfig.contacts.list.any.tag(),
  ];
  return withQuery(
    (opts) =>
      contacts.getContactFieldValues(contactId, {
        ...acDefaults(),
        ...options,
        ...opts,
      }),
    id,
    tags,
    { ...acDefaults(), ...(options ?? {}) },
  );
};

/** List/search contacts (coarse id from params) */
export const fetchContactsList = async (
  params: Record<string, unknown>,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ contacts: ACContact[] }>> => {
  const id = cacheConfig.contacts.list.any.id(JSON.stringify(params));
  const tags = [cacheConfig.contacts.list.any.tag()];
  return withQuery(
    (opts) => {
      const extraParams = (opts.params ?? {}) as Record<string, unknown>;
      const mergedParams: Record<string, unknown> = {
        ...params,
        ...extraParams,
      };
      return contacts.getContacts({
        ...acDefaults(),
        ...options,
        ...opts,
        params: mergedParams,
      });
    },
    id,
    tags,
    { ...acDefaults(), ...(options ?? {}) },
  );
};

/** Create contact (body validated minimally) */
export const createContactRaw = async (
  body: {
    contact: {
      email: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      fieldValues?: Array<{ field: string | number; value: string }>;
    };
  },
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ contact: ACContact }>> => {
  // Ensure at least email is present (spec sometimes marks other fields as required; keep call permissive)
  ContactsZ.createContactBody
    .pick({ contact: true })
    .shape.contact.pick({ email: true })
    .parse(body);
  return withMutation(
    (opts) =>
      contacts.createContact(body as never, {
        ...acDefaults(),
        ...options,
        ...opts,
      }),
    // a new contact can affect any list
    [cacheConfig.contacts.list.any.tag()],
    { ...acDefaults(), ...(options ?? {}) },
  );
};

/** Update/sync contact (by email; business layer fetches email first) */
export const syncContactRaw = async (
  body: {
    contact: {
      email: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      fieldValues?: Array<{ field: string | number; value: string }>;
    };
  },
  invalidateTags: Array<ReturnType<typeof cacheConfig.contacts.detail.tag>> = [
    cacheConfig.contacts.list.any.tag(),
  ],
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ contact: ACContact }>> => {
  ContactsZ.syncContactDataBody
    .pick({ contact: true })
    .shape.contact.pick({ email: true })
    .parse(body);
  return withMutation(
    (opts) =>
      contacts.syncContactData(body as never, {
        ...acDefaults(),
        ...options,
        ...opts,
      }),
    invalidateTags,
    { ...acDefaults(), ...(options ?? {}) },
  );
};

/** Delete contact */
export const deleteContactRaw = async (
  contactId: number,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<null>> => {
  ContactsZ.deleteContactParams.parse({ contactId });
  return withMutation(
    (opts) =>
      contacts.deleteContact(contactId, {
        ...acDefaults(),
        ...options,
        ...opts,
      }),
    [
      cacheConfig.contacts.detail.tag(String(contactId)),
      cacheConfig.contacts.list.any.tag(),
    ],
    { ...acDefaults(), ...(options ?? {}) },
  );
};
