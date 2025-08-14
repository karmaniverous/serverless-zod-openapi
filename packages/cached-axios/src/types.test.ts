import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { CacheProperties } from 'axios-cache-interceptor';
import { describe, expect, expectTypeOf, test } from 'vitest';

describe('axios type augmentations (cached-axios/types.d.ts)', () => {
  test('AxiosRequestConfig.cache supports false and Partial<CacheProperties>', () => {
    const cfgFalse: AxiosRequestConfig = { cache: false };
    const cfgPartial: AxiosRequestConfig = {
      cache: { etag: 'abc', id: 'id-1' },
    };
    expect(
      cfgFalse.cache === false || typeof cfgPartial.cache === 'object',
    ).toBe(true);

    // Compile-time structure check
    expectTypeOf<NonNullable<AxiosRequestConfig['cache']>>().toMatchTypeOf<
      Partial<CacheProperties>
    >();
  });

  test('AxiosResponse exposes optional "cached" flag', () => {
    const res: AxiosResponse<unknown> = {
      data: undefined,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as AxiosRequestConfig,
    };
    res.cached = true; // should type-check if augmentation is applied
    expect(res.cached).toBe(true);
  });

  test('CacheProperties include id/etag/update (partial acceptable)', () => {
    const props: Partial<CacheProperties> = {
      id: 'abc',
      etag: 'xyz',
      update: { 'cache-id': 'delete' },
    };
    expect(props.id).toBe('abc');
    expect(props.update?.['cache-id']).toBe('delete');
  });
});
