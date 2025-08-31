import type {
  AxiosRequestConfig,
  AxiosResponse,
} from '@karmaniverous/cached-axios';

import { getFieldValues } from '@@/generated/field-values/field-values';
import * as FieldValuesZ from '@@/generated/field-values/field-values.zod';
import { cacheConfig } from '@@/src/api/config';
import { coerceFieldValueForUpdate } from '@@/src/api/contacts/format';
import { getFieldMaps } from '@@/src/api/contacts/helpers';
import { cache } from '@@/src/http';

const fvs = getFieldValues();

/** Minimal response shape we rely on (spec lacks concrete responses) */
export type ACFieldValue = {
  id: string;
  contact: number; // numeric contact id per AC docs
  field: number;
  value: string;
};

/** List all custom field values, parameterized by arbitrary filters */
export const listFieldValues = async (
  query: Record<string, unknown>,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ fieldValues: ACFieldValue[] }>> => {
  const id = cacheConfig.contacts.id(['fieldValues', JSON.stringify(query)]);
  const tags = [cacheConfig.contacts.tag(['fieldValues'])];

  return cache.query<{ fieldValues: ACFieldValue[] }>(
    (opts) => {
      void opts; // unused by generated client
      return fvs.listAllCustomFieldValues();
    },
    id,
    tags,
    options,
  ) as Promise<AxiosResponse<{ fieldValues: ACFieldValue[] }>>;
};

/** Create or update a single field value for a contact */
export const upsertFieldValue = async (
  contactId: number,
  fieldId: number,
  value: string | string[],
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ fieldValue: ACFieldValue }>> => {
  const maps = await getFieldMaps(options);
  const meta = maps.byId.get(String(fieldId));

  const finalValue = coerceFieldValueForUpdate(meta, value);

  const payload = {
    fieldValue: {
      contact: contactId,
      field: fieldId,
      value: finalValue,
    },
  };
  FieldValuesZ.updateCustomFieldValueForContactBody.parse(payload);
  const cid = String(contactId);
  return cache.mutation<{ fieldValue: ACFieldValue }>(
    (opts) => {
      void opts; // unused by generated client
      return fvs.updateCustomFieldValueForContact(payload as never);
    },
    [cacheConfig.contacts.detail.tag(cid), cacheConfig.contacts.list.any.tag()],
    options,
  ) as Promise<AxiosResponse<{ fieldValue: ACFieldValue }>>;
}; /** Convenience: upsert a field value using a field perstag */
export const upsertFieldValueByPerstag = async (
  contactId: number,
  perstag: string,
  value: string | string[],
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ fieldValue: ACFieldValue }>> => {
  const maps = await getFieldMaps(options);
  const field = maps.byName.get(perstag);
  if (!field) throw new Error(`Custom field with perstag ${perstag} not found`);
  const fieldId = Number(field.id);

  const finalValue = coerceFieldValueForUpdate(field, value);

  return upsertFieldValue(contactId, fieldId, finalValue, options);
};

/**
 * Batch convenience: upsert many field values identified by perstag.
 * Resolves the catalog once (memoized) and performs writes with modest concurrency.
 */
export const upsertManyFieldValuesByPerstag = async (
  contactId: number,
  updates: Record<string, string | string[]>, // perstag -> value (string or array)
  options?: AxiosRequestConfig,
): Promise<Array<AxiosResponse<{ fieldValue: ACFieldValue }>>> => {
  const maps = await getFieldMaps(options);

  const tasks: Array<{ perstag: string; fieldId: number; value: string }> = [];
  const missing: string[] = [];
  for (const [perstag, raw] of Object.entries(updates)) {
    const meta = maps.byName.get(perstag);
    if (!meta) {
      missing.push(perstag);
      continue;
    }
    const coerced = coerceFieldValueForUpdate(meta, raw);
    tasks.push({ perstag, fieldId: Number(meta.id), value: coerced });
  }
  if (missing.length) {
    throw new Error(`Unknown perstag(s): ${missing.join(', ')}`);
  }

  // Simple concurrency gate (limit=5)
  const limit = 5;
  const results: Array<AxiosResponse<{ fieldValue: ACFieldValue }>> = [];
  let i = 0;
  while (i < tasks.length) {
    const slice = tasks.slice(i, i + limit);
    // Execute this batch in parallel
    const batch = await Promise.all(
      slice.map((t) =>
        upsertFieldValue(contactId, t.fieldId, t.value, options),
      ),
    );
    results.push(...batch);
    i += limit;
  }
  return results;
};
