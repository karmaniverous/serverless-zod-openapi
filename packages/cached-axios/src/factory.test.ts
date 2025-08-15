import type {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { describe, expect, test, vi } from 'vitest';

// Create mocks in a hoisted-safe way so vi.mock can reference them.
const { withQueryMock, withMutationMock } = vi.hoisted(() => {
  return {
    withQueryMock: vi.fn(),
    withMutationMock: vi.fn(),
  };
});

// Wire the hoisted mocks into the module stub.
vi.mock('./cache', () => ({
  withQuery: withQueryMock,
  withMutation: withMutationMock,
}));

import type { Id, Tag } from './config';
import { makeCacheHelpers } from './factory';

describe('makeCacheHelpers', () => {
  test('query() resolves base (function or object), merges options shallowly, and forwards to withQuery', async () => {
    // Provide concrete implementations for the hoisted mocks at runtime.
    withQueryMock.mockResolvedValue({
      data: undefined,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as unknown as InternalAxiosRequestConfig,
    } as AxiosResponse<unknown>);

    const baseFn = () =>
      ({
        baseURL: 'https://api.example',
        headers: { A: '1' },
        cache: { etag: 'E' },
      }) as AxiosRequestConfig;

    const { query } = makeCacheHelpers(baseFn);

    const call = vi.fn(
      async () =>
        ({
          data: undefined,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as unknown as InternalAxiosRequestConfig,
        }) as AxiosResponse<unknown>,
    );

    const id = 'id-1' as Id;
    const tags = ['tag:a'] as Tag[];

    await query(call, id, tags, { headers: { B: '2' } });

    expect(withQueryMock).toHaveBeenCalledTimes(1);

    // Avoid brittle tuple casts: destructure from unknown[]
    const raw = withQueryMock.mock.calls.at(0)! as unknown[];
    const passedCall = raw[0] as (
      o: AxiosRequestConfig,
    ) => Promise<AxiosResponse<unknown>>;
    const passedId = raw[1] as Id;
    const passedTags = raw[2] as Tag[];
    const passedBase = raw[3] as AxiosRequestConfig;

    // options override base on shallow merge
    expect(passedBase).toEqual(
      expect.objectContaining({
        baseURL: 'https://api.example',
        headers: { B: '2' },
        cache: { etag: 'E' },
      }),
    );
    expect(passedCall).toBe(call);
    expect(passedId).toBe(id);
    expect(passedTags).toEqual(tags);
  });

  test('mutation() resolves base and forwards to withMutation with invalidate tags', async () => {
    withMutationMock.mockResolvedValue({
      data: undefined,
      status: 202,
      statusText: 'Accepted',
      headers: {},
      config: {} as unknown as InternalAxiosRequestConfig,
    } as AxiosResponse<unknown>);

    const base = { timeout: 1234 } as AxiosRequestConfig;
    const { mutation } = makeCacheHelpers(base);

    const call = vi.fn(
      async () =>
        ({
          data: undefined,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as unknown as InternalAxiosRequestConfig,
        }) as AxiosResponse<unknown>,
    );

    const invalidate = ['tag:x', 'tag:y'] as Tag[];

    await mutation(call, invalidate, { headers: { C: '3' } });

    expect(withMutationMock).toHaveBeenCalledTimes(1);

    const raw = withMutationMock.mock.calls.at(0)! as unknown[];
    const mCall = raw[0] as (
      o: AxiosRequestConfig,
    ) => Promise<AxiosResponse<unknown>>;
    const mInvalidate = raw[1] as Tag[];
    const mBase = raw[2] as AxiosRequestConfig;

    expect(mCall).toBe(call);
    expect(mInvalidate).toEqual(invalidate);
    expect(mBase).toEqual(
      expect.objectContaining({ timeout: 1234, headers: { C: '3' } }),
    );
  });
});
