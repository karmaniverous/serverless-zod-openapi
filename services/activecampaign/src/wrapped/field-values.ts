import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { withMutation, withQuery } from 'axios';

import { getFieldValues } from '../../generated/field-values/field-values';
import * as FieldValuesZ from '../../generated/field-values/field-values.zod';
import { cacheConfig } from '../api/config';
import { getFieldMaps } from '../api/contacts/helpers';
import { acDefaults } from '../http';

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

  return withQuery(
    (opts) => {
      const extraParams = (opts.params ?? {}) as Record<string, unknown>;
      const mergedParams: Record<string, unknown> = {
        ...query,
        ...extraParams,
      };
      return fvs.listAllCustomFieldValues({
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

/** Create or update a single field value for a contact */
export const upsertFieldValue = async (
  contactId: number,
  fieldId: number,
  value: string,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ fieldValue: ACFieldValue }>> => {
  const payload = {
    fieldValue: {
      contact: contactId,
      field: fieldId,
      value,
    },
  };
  FieldValuesZ.updateCustomFieldValueForContactBody.parse(payload);
  const cid = String(contactId);
  return withMutation(
    (opts) =>
      fvs.updateCustomFieldValueForContact(payload as never, {
        ...acDefaults(),
        ...options,
        ...opts,
      }),
    [cacheConfig.contacts.detail.tag(cid), cacheConfig.contacts.list.any.tag()],
    { ...acDefaults(), ...(options ?? {}) },
  );
};

/** Convenience: upsert a field value using a field perstag */
export const upsertFieldValueByPerstag = async (
  contactId: number,
  perstag: string,
  value: string,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ fieldValue: ACFieldValue }>> => {
  const maps = await getFieldMaps(options);
  const field = maps.byName.get(perstag);
  if (!field) throw new Error(`Custom field with perstag ${perstag} not found`);
  const fieldId = Number(field.id);
  return upsertFieldValue(contactId, fieldId, value, options);
};

/**
 * Batch convenience: upsert many field values identified by perstag.
 * Resolves the catalog once (memoized) and performs writes with modest concurrency.
 */
export const upsertManyFieldValuesByPerstag = async (
  contactId: number,
  updates: Record<string, string>, // perstag -> value
  options?: AxiosRequestConfig,
): Promise<Array<AxiosResponse<{ fieldValue: ACFieldValue }>>> => {
  const maps = await getFieldMaps(options);

  const tasks: Array<{ perstag: string; fieldId: number; value: string }> = [];
  const missing: string[] = [];
  for (const [perstag, value] of Object.entries(updates)) {
    const meta = maps.byName.get(perstag);
    if (!meta) {
      missing.push(perstag);
      continue;
    }
    tasks.push({ perstag, fieldId: Number(meta.id), value });
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
    // eslint-disable-next-line no-await-in-loop
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
