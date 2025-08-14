import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { CacheProperties } from 'axios-cache-interceptor';

import type { Id, Tag } from './config';

/** In-memory tag→ids (tag -> set of cache IDs) */
const tagIndex = new Map<Tag, Set<Id>>();

const remember = (cacheId: Id, tags: Tag[]): void => {
  for (const t of tags) {
    const set = tagIndex.get(t) ?? new Set<Id>();
    set.add(cacheId);
    tagIndex.set(t, set);
  }
};

const idsFor = (tags: Tag[]): Id[] => {
  const out: Id[] = [];
  for (const t of tags) {
    const set = tagIndex.get(t);
    if (!set) continue;
    for (const id of set) out.push(id);
  }
  return out;
};

const inheritCache = (
  base?: AxiosRequestConfig,
): Partial<CacheProperties> | undefined => {
  const c = base?.cache;
  return c && typeof c === 'object' ? c : undefined;
};

const updateMapFor = (tags: Tag[]): Record<string, 'delete'> => {
  const update: Record<string, 'delete'> = {};
  for (const id of idsFor(tags)) update[id] = 'delete';
  return update;
};

/**
 * Wrap a GET-like call with a stable cache id and tag registration.
 * The inner call may return any AxiosResponse payload; we type the outer
 * value to <T> and leave response-validation to the caller (often via Zod).
 */
export const withQuery = async <T>(
  call: (opts: AxiosRequestConfig) => Promise<AxiosResponse<unknown>>,
  id: Id,
  tags: Tag[],
  base?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => {
  const cacheCfg: Partial<CacheProperties> = {
    ...(inheritCache(base) ?? {}),
    id,
  };

  const res = await call({
    ...(base ?? {}),
    cache: cacheCfg,
  });

  remember(id, tags);
  return res as AxiosResponse<T>;
};

/**
 * Wrap a write-like call with tag-based invalidation.
 * The inner call may return any AxiosResponse payload; consumers decide <T>.
 */
export const withMutation = async <T>(
  call: (opts: AxiosRequestConfig) => Promise<AxiosResponse<unknown>>,
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
  return res as AxiosResponse<T>;
};

export const _debug = {
  tagIndex,
  idsFor,
};
