import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { withQuery } from 'axios';

import { cacheConfig } from '../api/config';
import { getFieldValues } from '../generated/field-values/field-values';
import { acDefaults } from '../http';

const fvs = getFieldValues();

export type ACFieldValue = {
  id: string;
  contact: string;
  field: string;
  value: string;
};

export const listFieldValues = async (
  query: { 'filters[fieldid]'?: string | number; 'filters[val]'?: string },
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<{ fieldValues: ACFieldValue[] }>> => {
  const id = cacheConfig.contacts.list.any.id(JSON.stringify(query ?? {}));
  const tags = [cacheConfig.contacts.list.any.tag()];
  return withQuery(
    (opts) =>
      fvs.listAllCustomFieldValues({
        ...acDefaults(),
        ...options,
        ...opts,
        params: { ...query, ...(opts.params ?? {}) },
      }),
    id,
    tags,
    { ...acDefaults(), ...(options ?? {}) },
  );
};
