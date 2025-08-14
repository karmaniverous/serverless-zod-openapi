/* packages/axios/src/augmentation.d.ts */

import type { CacheRequestConfig } from 'axios-cache-interceptor';

declare module 'axios-raw' {
  export interface AxiosRequestConfig<D = unknown> {
    /**
     * Axios Cache Interceptor request configuration.
     * Added by module augmentation to avoid `any` usage.
     */
    cache?: CacheRequestConfig<D>;
  }

  export interface AxiosResponse<T = unknown, D = unknown> {
    /**
     * Present when response was served from cache.
     */
    cached?: boolean;
    /**
     * Previous response, when stale-while-revalidate is used.
     */
    previous?: AxiosResponse<T, D>;
  }
}
