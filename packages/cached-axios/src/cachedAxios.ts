import axios from 'axios';
import { setupCache } from 'axios-cache-interceptor';

/**
 * Shared Axios instance with ACI.
 * - No baseURL: services must pass baseURL+headers per request (safe for parallel calls).
 */
const base = axios.create();

export const cachedAxios = setupCache(base, {
  interpretHeader: true,
  staleIfError: true,
  ttl: 1000 * 60 * 5, // 5 minutes default if headers are missing
});

export type { AxiosCacheInstance } from 'axios-cache-interceptor';
