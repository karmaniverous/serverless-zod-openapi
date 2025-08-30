import type {
  AxiosRequestConfig,
  AxiosResponse,
} from '@karmaniverous/cached-axios';

import type { AddCustomFieldRequest } from '@/generated/api.schemas';
import { getCustomFieldsAndValues } from '@/generated/custom-fields-and-values/custom-fields-and-values';
import * as CFZ from '@/generated/custom-fields-and-values/custom-fields-and-values.zod';
import { cacheConfig } from '@/src/api/config';
import { cache } from '@/src/http';

const fields = getCustomFieldsAndValues();

export type ACField = {
  id: string;
  title: string;
  perstag?: string;
};

/** Catalog of all custom fields */
export const fetchAllFields = async (
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ fields: ACField[] }>> => {
  const id = cacheConfig.contacts.id(['fields', 'catalog']);
  const tags = [cacheConfig.contacts.tag(['fields', 'catalog'])];

  return cache.query<{ fields: ACField[] }>(
    (opts) => fields.listAllCustomFields(opts),
    id,
    tags,
    options,
  );
};

/** Create a new custom field */
export const createCustomField = async (
  body: AddCustomFieldRequest,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ field: ACField }>> => {
  CFZ.addCustomFieldBody.parse(body);
  return cache.mutation<{ field: ACField }>(
    (opts) => fields.addCustomField(body, opts),
    [cacheConfig.contacts.tag(['fields', 'catalog'])],
    options,
  );
};

/** Find a field by perstag (e.g., %MY_TAG%) */
export const findFieldByPerstag = async (
  perstag: string,
  options?: AxiosRequestConfig,
): Promise<ACField | undefined> => {
  const { data } = await fetchAllFields(options);
  return data.fields.find((f) => f.perstag === perstag);
};

/** Find a field by title (UI label) */
export const findFieldByTitle = async (
  title: string,
  options?: AxiosRequestConfig,
): Promise<ACField | undefined> => {
  const { data } = await fetchAllFields(options);
  return data.fields.find((f) => f.title === title);
};
