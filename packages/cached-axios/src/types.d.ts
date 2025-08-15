import type { CacheProperties } from 'axios-cache-interceptor';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * Axios Cache Interceptor request configuration.
     * Use `false` to disable caching for a single request.
     */
    cache?: false | Partial<CacheProperties>;
  }

  export interface AxiosResponse<T = unknown, D = unknown> {
    /** Present when response was served from cache. */
    cached?: boolean;
    /** Previous response, when stale-while-revalidate is used. */
    previous?: AxiosResponse<T, D>;
  }
}

/**
 * Extend ACI's `CacheProperties` with fields our helpers use.
 * No generics here to avoid unused type parameter lint.
 */
declare module 'axios-cache-interceptor' {
  interface CacheProperties {
    /** Custom cache id to override the default key */
    id?: string;
    /** ETag to associate with the request when server doesn't set one */
    etag?: string;
    /**
     * Map of cacheId => 'delete' operations used for invalidation.
     * This mirrors the internal shape consumed by setupCache().
     */
    update?: Record<string, 'delete'>;
  }
}
