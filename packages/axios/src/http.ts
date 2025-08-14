import { setupCache } from 'axios-cache-interceptor';
import axiosRaw, { type AxiosInstance } from 'axios-raw';

/**
 * Shared Axios instance with ACI.
 * - No baseURL: services must pass baseURL+headers per request (safe for parallel calls).
 */
const base: AxiosInstance = axiosRaw.create();

const http = setupCache(base, {
  interpretHeader: true,
  staleIfError: true,
  ttl: 1000 * 60 * 5, // 5 minutes default if headers are missing
});

export default http;
export type { AxiosCacheInstance } from 'axios-cache-interceptor';
