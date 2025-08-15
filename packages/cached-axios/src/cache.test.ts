import type {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { beforeEach, describe, expect, test } from 'vitest';

import { _debug, withMutation, withQuery } from './cache';
import type { Id, Tag } from './config';

const makeResp = (
  config: InternalAxiosRequestConfig,
): AxiosResponse<unknown> => ({
  data: undefined,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

describe('cache helpers (withQuery / withMutation)', () => {
  beforeEach(() => {
    _debug.tagIndex.clear();
  });

  test('withQuery registers id under tags and forwards merged cache options', async () => {
    const id = 'id-1' as Id;
    const tags: readonly [Tag, Tag] = ['tag:a' as Tag, 'tag:b' as Tag];

    let received: AxiosRequestConfig | undefined;
    const call = async (opts: AxiosRequestConfig) => {
      received = opts;
      return makeResp({} as unknown as InternalAxiosRequestConfig);
    };

    const base: AxiosRequestConfig = { cache: { etag: 'E1' } };

    const res = await withQuery<{ foo: string }>(call, id, [...tags], base);
    expect(res.status).toBe(200);

    // merged cache config should include inherited base.cache and our id
    const rc = received?.cache;
    expect(rc && typeof rc === 'object' ? rc : undefined).toEqual(
      expect.objectContaining({ id, etag: 'E1' }),
    );

    // tag index should contain id for both tags
    expect(_debug.tagIndex.get(tags[0])?.has(id)).toBe(true);
    expect(_debug.tagIndex.get(tags[1])?.has(id)).toBe(true);
  });

  test('withMutation builds update map from current ids and clears tag buckets', async () => {
    const id = 'id-2' as Id;
    const tags: readonly [Tag, Tag] = ['tag:x' as Tag, 'tag:y' as Tag];

    let received: AxiosRequestConfig | undefined;
    const call = async (opts: AxiosRequestConfig) => {
      received = opts;
      return makeResp({} as unknown as InternalAxiosRequestConfig);
    };

    // Pre-populate index by performing a query
    await withQuery(call, id, [...tags], { cache: { etag: 'E0' } });

    const base: AxiosRequestConfig = { cache: { etag: 'E2' } };
    const res = await withMutation<{ ok: boolean }>(call, [...tags], base);
    expect(res.status).toBe(200);

    // The update map should include id => 'delete'
    const rc = received?.cache as
      | { update?: Record<string, 'delete'> }
      | undefined;
    const expected: Record<string, 'delete'> = {};
    expected[id as unknown as string] = 'delete';
    expect(rc?.update).toEqual(expected);

    // buckets cleared
    expect(_debug.tagIndex.get(tags[0])).toBeUndefined();
    expect(_debug.tagIndex.get(tags[1])).toBeUndefined();
  });
});
