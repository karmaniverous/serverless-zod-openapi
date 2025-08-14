import type { AxiosRequestConfig } from 'axios';

import {
  type ACContact,
  type ACFieldValue,
  createContactRaw,
  deleteContactRaw,
  fetchContactCore,
  fetchContactFieldValues,
  fetchContactsList,
  syncContactRaw,
} from '../wrapped/contacts';
import {
  type ACField,
  fetchAllFields,
} from '../wrapped/custom-fields-and-values';
import {
  type ACFieldValue as ACFieldValueList,
  listFieldValues,
} from '../wrapped/field-values';
import { cacheConfig } from './config';

type Contact = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  fields: Record<string, unknown>; // flexible against remote schema drift
  [k: string]: unknown;
};

export type Contact = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  fields: Record<string, unknown>;
  [k: string]: unknown;
};

const toMapById = <T extends { id: string }>(rows: T[]): Map<string, T> => {
  const m = new Map<string, T>();
  for (const r of rows) m.set(String(r.id), r);
  return m;
};

type FieldMaps = { byId: Map<string, ACField>; byName: Map<string, ACField> };

const getFieldMaps = async (
  options?: AxiosRequestConfig,
): Promise<FieldMaps> => {
  const { data } = await fetchAllFields(options);
  const rows = (data?.fields ?? []) as ACField[];
  const byId = toMapById(rows);
  const byName = new Map<string, ACField>();
  for (const f of rows) {
    byName.set(f.title, f);
    if (f.perstag) byName.set(f.perstag, f);
  }
  return { byId, byName };
};

const materialize = (
  core: ACContact,
  fvals: ACFieldValue[],
  maps: FieldMaps,
): Contact => {
  const fields: Record<string, unknown> = {};
  for (const v of fvals) {
    const meta = maps.byId.get(String(v.field));
    const name = meta?.title ?? meta?.perstag ?? `field:${v.field}`;
    fields[name] = v.value;
  }
  const { id, email, phone, firstName, lastName, ...rest } = core;
  return { id: String(id), email, phone, firstName, lastName, fields, ...rest };
};

/** CREATE */
export const createContact = async (
  input: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    fields?: Record<string, unknown>;
  },
  options?: AxiosRequestConfig,
): Promise<Contact> => {
  const maps = await getFieldMaps(options);
  const fieldValues = input.fields
    ? Object.entries(input.fields).flatMap(([name, value]) => {
        const f = maps.byName.get(name);
        return f ? [{ field: f.id, value: String(value) }] : [];
      })
    : [];

  const { data } = await createContactRaw(
    {
      contact: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        fieldValues,
      },
    },
    options,
  );

  const id = String((data?.contact as ACContact).id);
  const res = await getContact(id, options);
  if (!res) throw new Error('Created contact not found');
  return res;
};

/** READ (detail + field values + catalog) */
export const getContact = async (
  contactId: string,
  options?: AxiosRequestConfig,
): Promise<Contact | undefined> => {
  const [{ data: coreRes }, { data: fvRes }, maps] = await Promise.all([
    fetchContactCore(contactId, options),
    fetchContactFieldValues(Number(contactId), options),
    getFieldMaps(options),
  ]);
  const core = coreRes?.contact as ACContact | undefined;
  if (!core) return undefined;
  const fvals = (fvRes?.fieldValues ?? []) as ACFieldValue[];
  return materialize(core, fvals, maps);
};

/** UPDATE (sync by email; we fetch current to get email) */
export const updateContact = async (
  contactId: string,
  update: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    fields?: Record<string, unknown>;
  },
  options?: AxiosRequestConfig,
): Promise<Contact | undefined> => {
  const current = await getContact(contactId, options);
  if (!current?.email) return current;

  const maps = await getFieldMaps(options);
  const fieldValues = update.fields
    ? Object.entries(update.fields).flatMap(([name, value]) => {
        const f = maps.byName.get(name);
        return f ? [{ field: f.id, value: String(value) }] : [];
      })
    : undefined;

  await syncContactRaw(
    {
      contact: {
        email: current.email,
        firstName: update.firstName ?? current.firstName,
        lastName: update.lastName ?? current.lastName,
        phone: update.phone ?? current.phone,
        ...(fieldValues ? { fieldValues } : {}),
      },
    },
    // Invalidate this contact detail + any lists
    [
      cacheConfig.contacts.detail.tag(contactId),
      cacheConfig.contacts.list.any.tag(),
    ],
    options,
  );

  return getContact(contactId, options);
};

/** DELETE */
export const deleteContact = async (
  contactId: string,
  options?: AxiosRequestConfig,
): Promise<void> => {
  await deleteContactRaw(Number(contactId), options);
};

/** LIST/SEARCH (with optional filter by custom field) */
export const listContacts = async (
  params: {
    search?: string;
    limit?: number;
    offset?: number;
    customFieldFilter?: { name: string; value: string };
  } = {},
  options?: AxiosRequestConfig,
): Promise<{ contacts: Contact[]; total?: number }> => {
  const maps = await getFieldMaps(options);

  // If filtering by custom field, discover matching contact ids first.
  let allowIds: string[] | undefined;
  if (params.customFieldFilter) {
    const meta = maps.byName.get(params.customFieldFilter.name);
    if (meta) {
      const { data } = await listFieldValues(
        {
          'filters[fieldid]': meta.id,
          'filters[val]': String(params.customFieldFilter.value),
        },
        options,
      );
      allowIds = (data.fieldValues ?? []).map((v: ACFieldValueList) =>
        String(v.contact),
      );
    }
  }

  const baseRes = await fetchContactsList(
    {
      ...(params.search ? { search: params.search } : {}),
      ...(typeof params.limit === 'number' ? { limit: params.limit } : {}),
      ...(typeof params.offset === 'number' ? { offset: params.offset } : {}),
    },
    options,
  );

  const rows = (baseRes.data?.contacts ?? []) as ACContact[];
  const filtered = allowIds
    ? rows.filter((r) => allowIds!.includes(String(r.id)))
    : rows;

  // Materialize each result
  const out: Contact[] = [];
  for (const r of filtered) {
    const { data: fvRes } = await fetchContactFieldValues(
      Number(r.id),
      options,
    );
    const fvals = (fvRes?.fieldValues ?? []) as ACFieldValue[];
    out.push(materialize(r, fvals, maps));
  }

  return { contacts: out, total: out.length };
};
