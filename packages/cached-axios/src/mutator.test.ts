import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { describe, expect, test, vi } from 'vitest';

const requestMock = vi.fn(
  async (cfg: AxiosRequestConfig) =>
    ({
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: cfg,
    }) as AxiosResponse<{ ok: boolean }>,
);

vi.mock('./cachedAxios', () => ({
  cachedAxios: { request: requestMock },
}));

import { orvalMutator } from './mutator';

describe('orvalMutator', () => {
  test('forwards merged config to cachedAxios.request and returns its response', async () => {
    const res = await orvalMutator<{ ok: boolean }, { foo: number }>(
      { url: '/thing', method: 'post', data: { foo: 1 } },
      { headers: { 'X-Test': '1' } },
    );

    expect(requestMock).toHaveBeenCalledTimes(1);
    const final = requestMock.mock.calls[0]?.[0] as AxiosRequestConfig;

    expect(final).toEqual(
      expect.objectContaining({
        url: '/thing',
        method: 'post',
        data: { foo: 1 },
        headers: { 'X-Test': '1' },
      }),
    );

    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
  });

  test('options override config on shallow merge', async () => {
    await orvalMutator(
      { url: '/x', headers: { A: 'a' } },
      { headers: { B: 'b' } },
    );
    const final = requestMock.mock.calls.at(-1)?.[0] as AxiosRequestConfig;
    expect(final.headers).toEqual({ B: 'b' });
  });
});
