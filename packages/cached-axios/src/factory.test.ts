import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { describe, expect, test, vi } from 'vitest';

// Mock the cache-layer helpers that factory forwards into
const withQueryMock = vi.fn(
  async () =>
    ({
      data: undefined,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as AxiosRequestConfig,
    }) as AxiosResponse<unknown>,
);

const withMutationMock = vi.fn(
  async () =>
    ({
      data: undefined,
      status: 202,
      statusText: 'Accepted',
      headers: {},
      config: {} as AxiosRequestConfig,
    }) as AxiosResponse<unknown>,
);

vi.mock('./cache', () => ({
  withQuery: withQueryMock,
  withMutation: withMutationMock,
}));

import type { Id, Tag } from './config';
import { makeCacheHelpers } from './factory';

describe('makeCacheHelpers', () => {
  test('query() resolves base (function or object), merges options shallowly, and forwards to withQuery', async () => {
    const baseFn = () =>
      ({
        baseURL: 'https://api.example',
        headers: { A: '1' },
        cache: { etag: 'E' },
      }) as AxiosRequestConfig;

    const { query } = makeCacheHelpers(baseFn);

    const call = vi.fn(async (opts: AxiosRequestConfig) => ({
      data: undefined,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: opts,
    }));

    const id = 'id-1' as Id;
    const tags = ['tag:a'] as Tag[];

    await query(call, id, tags, { headers: { B: '2' } });

    expect(withQueryMock).toHaveBeenCalledTimes(1);
    const args = withQueryMock.mock.calls[0] as [
      (o: AxiosRequestConfig) => Promise<AxiosResponse<unknown>>,
      Id,
      Tag[],
      AxiosRequestConfig,
    ];
    const passedBase = args[3];

    // options override base on shallow merge
    expect(passedBase).toEqual(
      expect.objectContaining({
        baseURL: 'https://api.example',
        headers: { B: '2' },
        cache: { etag: 'E' },
      }),
    );
    expect(args[0]).toBe(call);
    expect(args[1]).toBe(id);
    expect(args[2]).toEqual(tags);
  });

  test('mutation() resolves base and forwards to withMutation with invalidate tags', async () => {
    const base = { timeout: 1234 } as AxiosRequestConfig;
    const { mutation } = makeCacheHelpers(base);

    const call = vi.fn(async (opts: AxiosRequestConfig) => ({
      data: undefined,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: opts,
    }));

    const invalidate = ['tag:x', 'tag:y'] as Tag[];

    await mutation(call, invalidate, { headers: { C: '3' } });

    expect(withMutationMock).toHaveBeenCalledTimes(1);
    const args = withMutationMock.mock.calls[0] as [
      (o: AxiosRequestConfig) => Promise<AxiosResponse<unknown>>,
      Tag[],
      AxiosRequestConfig,
    ];
    expect(args[0]).toBe(call);
    expect(args[1]).toEqual(invalidate);
    expect(args[2]).toEqual(
      expect.objectContaining({ timeout: 1234, headers: { C: '3' } }),
    );
  });
});
