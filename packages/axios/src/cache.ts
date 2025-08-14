/* packages/axios/src/cache.ts */

import type { CacheProperties } from 'axios-cache-interceptor';
import type { AxiosRequestConfig, AxiosResponse } from 'axios-raw';

import type { Id, Tag } from './config';

/** In-memory tag→ids */
const tagIndex = new Map<Tag, Set<Id>>();

const remember = (cacheId: Id, tags: Tag[]): void => {
  for (const t of tags) {
    const set = tagIndex.get(t) ?? new Set<Id>();
    set.add(cacheId);
    tagIndex.set(t, set);
  }
};

const idsFor = (tags: Tag[]): Set<Id> => {
  const out = new Set<Id>();
  for (const t of tags) {
    for (const id of tagIndex.get(t) ?? []) out.add(id);
  }
  return out;
};

const updateMapFor = (tags: Tag[]): Record<string, 'delete'> => {
  const map: Record<string, 'delete'> = {};
  for (const id of idsFor(tags)) map[id] = 'delete';
  return map;
};

const inheritCache = (
  base?: AxiosRequestConfig,
): Partial<CacheProperties> | undefined => {
  const c = base?.cache;
  return c && typeof c === 'object' ? c : undefined;
};

/** Apply ACI cache id to a GET-like request and register tags on success. */
export const withQuery = async <T>(
  call: (opts: AxiosRequestConfig) => Promise<AxiosResponse<T>>,
  cacheId: Id,
  tags: Tag[],
  base?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => {
  const cacheCfg: Partial<CacheProperties> = {
    ...(inheritCache(base) ?? {}),
    id: String(cacheId),
  };

  const res = await call({
    ...(base ?? {}),
    cache: cacheCfg,
  });

  remember(cacheId, tags);
  return res;
};

/** Apply invalidation map to a mutation-like request and clear tag buckets. */
export const withMutation = async <T>(
  call: (opts: AxiosRequestConfig) => Promise<AxiosResponse<T>>,
  invalidate: Tag[],
  base?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => {
  const cacheCfg: Partial<CacheProperties> = {
    ...(inheritCache(base) ?? {}),
    update: updateMapFor(invalidate),
  };

  const res = await call({
    ...(base ?? {}),
    cache: cacheCfg,
  });

  // clear tag buckets (ids will be gone from storage)
  for (const t of invalidate) tagIndex.delete(t);
  return res;
};

export const _debug = {
  tagIndex,
  idsFor,
};
