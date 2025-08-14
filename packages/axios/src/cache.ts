/* packages/axios/src/cache.ts */

import type { CacheRequestConfig } from 'axios-cache-interceptor';
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

const idsFor = (tags: Tag[]): Id[] => {
  const acc = new Set<Id>();
  for (const t of tags) {
    const s = tagIndex.get(t);
    if (!s) continue;
    for (const id of s) acc.add(id);
  }
  return [...acc];
};

const updateMapFor = (tags: Tag[]): Record<string, 'delete'> => {
  const map: Record<string, 'delete'> = {};
  for (const id of idsFor(tags)) map[id] = 'delete';
  return map;
};

/** Apply ACI cache id to a GET-like request and register tags on success. */
export const withQuery = async <T>(
  call: (opts: AxiosRequestConfig) => Promise<AxiosResponse<T>>,
  cacheId: Id,
  tags: Tag[],
  base?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => {
  const baseCache: CacheRequestConfig | undefined = base?.cache ?? undefined;

  const cacheCfg: CacheRequestConfig = {
    id: cacheId,
    etag: true,
    modifiedSince: true,
    staleIfError: true,
    ...(baseCache ?? {}),
  };

  const res = await call({
    ...(base ?? {}),
    cache: cacheCfg,
  });
  remember(cacheId, tags);
  return res;
};

/** Attach ACI cache.update built from tags. Invalidation occurs after success. */
export const withMutation = async <T>(
  call: (opts: AxiosRequestConfig) => Promise<AxiosResponse<T>>,
  invalidate: Tag[],
  base?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => {
  const baseCache: CacheRequestConfig | undefined = base?.cache ?? undefined;

  const cacheCfg: CacheRequestConfig = {
    ...(baseCache ?? {}),
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
