import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';

import { cachedAxios } from './cachedAxios';

export type OrvalErrorType<E> = AxiosError<E>;
export type OrvalBodyType<B> = B;

/**
 * Orval-compatible mutator.
 * Always resolves to AxiosResponse<T>, regardless of how the generator
 * instantiates the generic parameter.
 */
export const orvalMutator = async <T = unknown, R = unknown>(
  config: AxiosRequestConfig<R>,
  options?: AxiosRequestConfig<R>,
): Promise<AxiosResponse<T>> => {
  const final: AxiosRequestConfig<R> = { ...config, ...(options ?? {}) };

  // Call through the base AxiosInstance signature to avoid CacheRequestConfig mismatch
  const res = await (cachedAxios as unknown as AxiosInstance).request<
    T,
    AxiosResponse<T>,
    R
  >(final);

  return res;
};
