import type { AxiosRequestConfig, AxiosResponse } from 'axios';

import type {
  CreateContactRequest,
  SyncContactDataRequest,
} from '../../generated/api.schemas';
import { getContacts } from '../../generated/contacts/contacts';
import * as ContactsZ from '../../generated/contacts/contacts.zod';
import { cacheConfig } from '../api/config';
import { cache } from '../http';

const contacts = getContacts();

/** Minimal response shapes (spec lacks typed responses in codegen) */
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
  contact: number; // ActiveCampaign expects numeric contact id in field values
  field: number;
  value: string;
};

/** Retrieve a single contact by ID */
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
  return cache.query<{ contact: ACContact }>(
    (opts) => contacts.getContactbyID(contactId, opts),
    id,
    tags,
    options,
  );
};

/** Retrieve all field values for a contact */
export const fetchContactFieldValues = async (
  contactId: number,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ fieldValues: ACFieldValue[] }>> => {
  ContactsZ.getContactFieldValuesParams.parse({ contactId });
  const cid = String(contactId);
  const id = cacheConfig.contacts.detail.id(cid); // share the detail bucket
  const tags = [
    cacheConfig.contacts.detail.tag(cid),
    cacheConfig.contacts.list.any.tag(),
  ];
  return cache.query<{ fieldValues: ACFieldValue[] }>(
    (opts) => contacts.getContactFieldValues(contactId, opts),
    id,
    tags,
    options,
  );
};

/** List/search contacts (query passthrough) */
export const fetchContactsList = async (
  params: Record<string, unknown>,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ contacts: ACContact[] }>> => {
  const id = cacheConfig.contacts.list.any.id(JSON.stringify(params));
  const tags = [cacheConfig.contacts.list.any.tag()];
  return cache.query<{ contacts: ACContact[] }>(
    (opts) => {
      const extraParams = (opts.params ?? {}) as Record<string, unknown>;
      const mergedParams: Record<string, unknown> = {
        ...params,
        ...extraParams,
      };
      return contacts.getContacts({
        ...opts,
        params: mergedParams,
      });
    },
    id,
    tags,
    options,
  );
};

/** Create a contact */
export const createContactRaw = async (
  body: CreateContactRequest,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ contact: ACContact }>> => {
  ContactsZ.createContactBody.parse(body);
  return cache.mutation<{ contact: ACContact }>(
    (opts) => contacts.createContact(body, opts),
    // A new/updated contact affects list queries
    [cacheConfig.contacts.list.any.tag()],
    options,
  );
};

/** Sync contact data (identifies by email; can include fieldValues {field,value}[]) */
export const syncContactRaw = async (
  body: SyncContactDataRequest,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ contact: ACContact }>> => {
  ContactsZ.syncContactDataBody.parse(body);
  return cache.mutation<{ contact: ACContact }>(
    (opts) => contacts.syncContactData(body, opts),
    // We cannot safely compute a specific contact id here; drop list caches
    [cacheConfig.contacts.list.any.tag()],
    options,
  );
};

/** Delete a contact by numeric ID */
export const deleteContactRaw = async (
  contactId: number,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<null>> => {
  ContactsZ.deleteContactParams.parse({ contactId });
  const cid = String(contactId);
  return cache.mutation<null>(
    (opts) => contacts.deleteContact(contactId, opts),
    [cacheConfig.contacts.detail.tag(cid), cacheConfig.contacts.list.any.tag()],
    options,
  );
};
