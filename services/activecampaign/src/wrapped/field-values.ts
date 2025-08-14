import {
  type AxiosRequestConfig,
  type AxiosResponse,
  withQuery,
} from '@karmaniverous/cached-axios';

import { getFieldValues } from '../../generated/field-values/field-values';
import { cacheConfig } from '../api/config';
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
  const id = cacheConfig.contacts.list.any.id(JSON.stringify(query));
  const tags = [cacheConfig.contacts.list.any.tag()];
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
