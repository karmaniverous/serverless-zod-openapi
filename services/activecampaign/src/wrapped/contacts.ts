import {
  type AxiosRequestConfig,
  type AxiosResponse,
  withMutation,
  withQuery,
} from '@karmaniverous/cached-axios';

import { getContacts } from '@/generated/contacts/contacts';
import * as ContactsZ from '@/generated/contacts/contacts.zod';
import { cacheConfig } from '@/src/api/config';
import { acDefaults } from '@/src/http';

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
  contact: number; // numeric contact id
  field: number;
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
  ) as Promise<AxiosResponse<{ contact: ACContact }>>;
};

/** Field values for a contact */
export const fetchContactFieldValues = async (
  contactId: number,  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ fieldValues: ACFieldValue[] }>> => {
  ContactsZ.getContactFieldValuesParams.parse({ contactId });
  const cid = String(contactId);
  const id = cacheConfig.contacts.detail.id(cid);
  const tags = [
    cacheConfig.contacts.detail.tag(cid),
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
  ) as Promise<AxiosResponse<{ fieldValues: ACFieldValue[] }>>;
};

/** List/search contacts (coarse id from params) */
export const fetchContactsList = async (  params: Record<string, unknown>,
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
  ) as Promise<AxiosResponse<{ contacts: ACContact[] }>>;
};

/** Create contact (body validated minimally) */
export const createContactRaw = async (  body: {
    contact: {
      email: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
    };
  },
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ contact: ACContact }>> => {
  ContactsZ.createContactBody.parse(body);
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
  ) as Promise<AxiosResponse<{ contact: ACContact }>>;
};

/** Update/sync contact (by email; business layer supplies email) */
export const syncContactRaw = async (  body: {
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
  ContactsZ.syncContactDataBody.parse(body);
  return withMutation(
    (opts) =>
      contacts.syncContactData(body as never, {
        ...acDefaults(),
        ...options,
        ...opts,
      }),
    // We can't target specific contact cache safely here; clear list buckets
    [cacheConfig.contacts.list.any.tag()],
    { ...acDefaults(), ...(options ?? {}) },
  ) as Promise<AxiosResponse<{ contact: ACContact }>>;
};

/** Delete contact */
export const deleteContactRaw = async (  contactId: number,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<null>> => {
  ContactsZ.deleteContactParams.parse({ contactId });
  const cid = String(contactId);
  return withMutation(
    (opts) =>
      contacts.deleteContact(contactId, {
        ...acDefaults(),
        ...options,
        ...opts,
      }),
    [cacheConfig.contacts.detail.tag(cid), cacheConfig.contacts.list.any.tag()],
    { ...acDefaults(), ...(options ?? {}) },
  ) as Promise<AxiosResponse<null>>;
};