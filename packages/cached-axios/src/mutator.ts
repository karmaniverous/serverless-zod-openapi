import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';

import http from './http';

export type OrvalErrorType<E> = AxiosError<E>;
export type OrvalBodyType<B> = B;

/** Orval-compatible mutator (cache-aware, typed, no `any`) */
export const orvalMutator = async <T = AxiosResponse, R = unknown>(
  config: AxiosRequestConfig<R>,
  options?: AxiosRequestConfig<R>,
): Promise<T> => {
  const final: AxiosRequestConfig<R> = { ...config, ...(options ?? {}) };
  // Call through the base AxiosInstance signature to avoid CacheRequestConfig generic mismatch
  const res = await (http as unknown as AxiosInstance).request<
    R,
    AxiosResponse<R>,
    R
  >(final);
  return res as unknown as T;
};
