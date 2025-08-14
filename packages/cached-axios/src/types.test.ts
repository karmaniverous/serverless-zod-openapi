import type {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import type { CacheProperties } from 'axios-cache-interceptor';
import { describe, expect, expectTypeOf, test } from 'vitest';

describe('axios type augmentations (cached-axios/types.d.ts)', () => {
  test('AxiosRequestConfig.cache supports false and Partial<CacheProperties>', () => {
    const cfgFalse: AxiosRequestConfig = { cache: false };
    const cfgPartial: AxiosRequestConfig = {
      cache: { etag: 'abc', id: 'id-1' } as Partial<CacheProperties>,
    };

    // Runtime sanity
    expect(
      cfgFalse.cache === false || typeof cfgPartial.cache === 'object',
    ).toBe(true);

    // Compile-time: only the object arm must extend Partial<CacheProperties>
    type CacheObj = Extract<AxiosRequestConfig['cache'], object>;
    expectTypeOf<CacheObj>().toExtend<Partial<CacheProperties>>();
  });

  test('AxiosResponse exposes optional "cached" flag', () => {
    const res: AxiosResponse<unknown> = {
      data: undefined,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as unknown as InternalAxiosRequestConfig,
    };
    res.cached = true; // should type-check if augmentation is applied
    expect(res.cached).toBe(true);
  });

  test('CacheProperties basic shape accepts id/etag (partial acceptable)', () => {
    const props: Partial<CacheProperties> = {
      id: 'abc',
      etag: 'xyz',
    };
    expect(props.id).toBe('abc');
    expect(props.etag).toBe('xyz');
  });
});
