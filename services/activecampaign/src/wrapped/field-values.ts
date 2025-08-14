import type { AxiosRequestConfig, AxiosResponse } from 'axios';

import { getFieldValues } from '../../generated/field-values/field-values';
import * as FieldValuesZ from '../../generated/field-values/field-values.zod';
import { cacheConfig } from '../api/config';
import { cache } from '../http';

const fvs = getFieldValues();

export type ACFieldValue = {
  id: string;
  contact: number;
  field: number;
  value: string;
};

/** List all custom field values (filtered by params) */
export const listFieldValues = async (
  params: Record<string, unknown>,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ fieldValues: ACFieldValue[] }>> => {
  const id = cacheConfig.contacts.id(['fieldValues', JSON.stringify(params)]);
  const tags = [cacheConfig.contacts.tag(['fieldValues'])];

  return cache.query<{ fieldValues: ACFieldValue[] }>(
    (opts) => {
      const extraParams = (opts.params ?? {}) as Record<string, unknown>;
      const mergedParams: Record<string, unknown> = {
        ...params,
        ...extraParams,
      };
      return fvs.listAllCustomFieldValues({
        ...opts,
        params: mergedParams,
      });
    },
    id,
    tags,
    options,
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
  return cache.mutation<{ fieldValue: ACFieldValue }>(
    (opts) => fvs.updateCustomFieldValueForContact(payload as never, opts),
    [cacheConfig.contacts.detail.tag(cid), cacheConfig.contacts.list.any.tag()],
    options,
  );
};

/** Convenience: upsert a field value using a field perstag */
export const upsertFieldValueByPerstag = async (
  contactId: number,
  perstag: string,
  value: string,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ fieldValue: ACFieldValue }>> => {
  const { findFieldByPerstag } = await import('./custom-fields-and-values');
  const field = await findFieldByPerstag(perstag, options);
  if (!field) {
    throw new Error(`Custom field with perstag ${perstag} not found`);
  }
  const fieldId = Number(field.id);
  return upsertFieldValue(contactId, fieldId, value, options);
};
