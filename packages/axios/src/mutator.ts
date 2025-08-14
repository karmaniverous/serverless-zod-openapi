import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios-raw';

import http from './http';

export type OrvalErrorType<E> = AxiosError<E>;
export type OrvalBodyType<B> = B;

/** Orval-compatible mutator (cache-aware, no `any`) */
export const orvalMutator = async <T = AxiosResponse, R = unknown>(
  config: AxiosRequestConfig<R>,
  options?: AxiosRequestConfig<R>,
): Promise<T> => {
  const final: AxiosRequestConfig<R> = { ...config, ...(options ?? {}) };
  const res = await http.request<R, AxiosResponse<R>>(final);
  return res as unknown as T;
};
