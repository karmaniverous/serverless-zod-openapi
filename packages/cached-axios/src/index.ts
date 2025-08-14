export { withMutation, withQuery } from './cache';
export { cachedAxios } from './cachedAxios';
export type { BuiltNode, ConfigInput, Id, Tag } from './config';
export { buildConfig, ConfigInputSchema } from './config';
export { makeCacheHelpers } from './factory';
export {
  type OrvalBodyType,
  type OrvalErrorType,
  orvalMutator,
} from './mutator';

// Re-export axios types for generated code compatibility
export type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// Re-export ACI types used in our local augmentations
export type {
  CacheProperties,
  CacheRequestConfig,
} from 'axios-cache-interceptor';
