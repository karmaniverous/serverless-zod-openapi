import type { AxiosRequestConfig, AxiosResponse } from 'axios';

import { withMutation, withQuery } from './cache';
import type { Id, Tag } from './config';

type BaseInput =
  | AxiosRequestConfig
  | (() => AxiosRequestConfig | undefined)
  | undefined;

const resolveBase = (
  base: BaseInput,
  options?: AxiosRequestConfig,
): AxiosRequestConfig | undefined => {
  const b = typeof base === 'function' ? base() : base;
  return { ...(b ?? {}), ...(options ?? {}) };
};

/**
 * Create pre-bound cache helpers with a base Axios config.
 * Keep this generic. Domain semantics (id/tag generation) live in the service.
 */
export const makeCacheHelpers = (base?: BaseInput) => {
  const query = async <T>(
    call: (opts: AxiosRequestConfig) => Promise<AxiosResponse<unknown>>,
    id: Id,
    tags: Tag[],
    options?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> => {
    return withQuery<T>(call, id, tags, resolveBase(base, options));
  };

  const mutation = async <T>(
    call: (opts: AxiosRequestConfig) => Promise<AxiosResponse<unknown>>,
    invalidate: Tag[],
    options?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> => {
    return withMutation<T>(call, invalidate, resolveBase(base, options));
  };

  return { query, mutation };
};
