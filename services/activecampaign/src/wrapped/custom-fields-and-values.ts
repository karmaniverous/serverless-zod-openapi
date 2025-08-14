import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { withQuery } from 'axios';
import { acDefaults } from '../http';
import { cacheConfig } from '../api/config';

import { getCustomFieldsAndValues } from '../../generated/custom-fields-and-values/custom-fields-and-values';

const fields = getCustomFieldsAndValues();

export type ACField = {
  id: string;
  title: string;
  perstag?: string;
  type?: string;
};

export const fetchAllFields = async (
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ fields: ACField[] }>> => {
  // Use a deterministic Id and a specific Tag for the catalog
  const id = cacheConfig.contacts.id(['fields', 'catalog']);
  const tags = [cacheConfig.contacts.tag(['fields', 'catalog'])];
  return withQuery(
    (opts) =>
      fields.listAllCustomFields({ ...acDefaults(), ...options, ...opts }),
    id,
    tags,
    { ...acDefaults(), ...(options ?? {}) },
  );
};
