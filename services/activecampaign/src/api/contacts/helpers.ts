import type { AxiosRequestConfig } from 'axios';

import type { ACContact, ACFieldValue } from '../../wrapped/contacts';
import type { ACField } from '../../wrapped/custom-fields-and-values';
import { fetchAllFields } from '../../wrapped/custom-fields-and-values';
import { type Contact, ContactZ } from './schemas';

const toMapById = <T extends { id: string }>(rows: T[]): Map<string, T> => {
  const m = new Map<string, T>();
  for (const r of rows) m.set(r.id, r);
  return m;
};

export type FieldMaps = {
  byId: Map<string, ACField>;
  byName: Map<string, ACField>;
};

export const getFieldMaps = async (
  options?: AxiosRequestConfig,
): Promise<FieldMaps> => {
  const { data } = await fetchAllFields(options);
  const rows = (data?.fields ?? []);
  const byId = toMapById(rows);
  const byName = new Map<string, ACField>();
  for (const f of rows) {
    byName.set(f.title, f);
    if (f.perstag) byName.set(f.perstag, f);
  }
  return { byId, byName };
};

export const materialize = (
  core: ACContact,
  fvals: ACFieldValue[],
  maps: FieldMaps,
): Contact => {
  const fields: Record<string, unknown> = {};
  for (const v of fvals) {
    const meta = maps.byId.get(v.field);
    const name = meta?.title ?? meta?.perstag ?? `field:${v.field}`;
    fields[name] = v.value;
  }
  const { id, email, phone, firstName, lastName, ...rest } = core;
  // Validate and freeze the shape from Zod
  return ContactZ.parse({
    id,
    email,
    phone,
    firstName,
    lastName,
    fields,
    ...rest,
  });
};
