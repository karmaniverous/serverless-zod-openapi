import type {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { describe, expect, test, vi } from 'vitest';

// Hoisted-safe mock holder
const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));

vi.mock('./cachedAxios', () => ({
  cachedAxios: { request: requestMock },
}));

import { orvalMutator } from './mutator';

describe('orvalMutator', () => {
  test('forwards merged config to cachedAxios.request and returns its response', async () => {
    requestMock.mockResolvedValue({
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as unknown as InternalAxiosRequestConfig,
    } as AxiosResponse<{ ok: boolean }>);

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
    requestMock.mockResolvedValue({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as unknown as InternalAxiosRequestConfig,
    } as AxiosResponse<unknown>);

    await orvalMutator(
      { url: '/x', headers: { A: 'a' } },
      { headers: { B: 'b' } },
    );
    const final = requestMock.mock.calls.at(-1)?.[0] as AxiosRequestConfig;
    expect(final.headers).toEqual({ B: 'b' });
  });
});
