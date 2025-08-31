import type { AxiosRequestConfig } from '@karmaniverous/cached-axios';

import type { ACContact, ACFieldValue } from '@@/src/wrapped/contacts';
import type { ACField } from '@@/src/wrapped/custom-fields-and-values';
import { fetchAllFields } from '@@/src/wrapped/custom-fields-and-values';

import { type Contact, contactSchema } from './schemas';

/** Build a Map keyed by string id */
const toMapById = <T extends { id: string }>(rows: T[]): Map<string, T> => {
  const m = new Map<string, T>();
  for (const r of rows) m.set(r.id, r);
  return m;
};

export type FieldMaps = {
  byId: Map<string, ACField>;
  byName: Map<string, ACField>;
};

type Cached = { at: number; maps: FieldMaps };
let _cached: Cached | undefined;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export const getFieldMaps = async (
  options?: AxiosRequestConfig,
): Promise<FieldMaps> => {
  const now = Date.now();
  if (_cached && now - _cached.at < TTL_MS) return _cached.maps;

  const { data } = await fetchAllFields(options);
  const rows = data.fields;
  const byId = toMapById(rows);
  const byName = new Map<string, ACField>();
  for (const f of rows) {
    byName.set(f.title, f);
    if (f.perstag) byName.set(f.perstag, f);
  }
  _cached = { at: now, maps: { byId, byName } };
  return _cached.maps;
};

/** Resolve a field by perstag (e.g., %MY_TAG%) using the memoized catalog. */
export const findFieldByPerstag = async (
  perstag: string,
  options?: AxiosRequestConfig,
): Promise<ACField | undefined> => {
  const maps = await getFieldMaps(options);
  return maps.byName.get(perstag);
};

/** Convert a raw AC contact core + field-values into our domain Contact. */
export const materialize = (
  core: ACContact,
  fieldValues: ACFieldValue[],
  maps: FieldMaps,
): Contact => {
  const fields: Record<string, unknown> = {};

  for (const v of fieldValues) {
    const key = String(v.field);
    const meta = maps.byId.get(key);
    const name = meta?.title ?? meta?.perstag ?? `field:${key}`;
    fields[name] = v.value;
  }

  const { id, email, phone, firstName, lastName, ...rest } = core;

  // Validate and freeze the shape from Zod
  return contactSchema.parse({
    id,
    email,
    phone,
    firstName,
    lastName,
    fields,
    ...rest,
  });
};
