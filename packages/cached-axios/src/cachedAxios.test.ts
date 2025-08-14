import { afterEach, describe, expect, test, vi } from 'vitest';

// Prepare controlled mocks BEFORE importing the module under test.
const baseInstance = { request: vi.fn() };

vi.mock('axios', () => ({
  default: { create: vi.fn(() => baseInstance) },
}));

const setupCacheMock = vi.fn((base: unknown, opts: unknown) => ({
  request: vi.fn(),
  _base: base,
  _opts: opts,
}));

vi.mock('axios-cache-interceptor', () => ({
  setupCache: setupCacheMock,
}));

describe('cachedAxios', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('wraps a fresh axios instance with axios-cache-interceptor using expected defaults', async () => {
    // Import AFTER mocks so module factory runs with our fakes.
    const mod = await import('./cachedAxios');
    const { cachedAxios } = mod;

    // It should have called setupCache once with our base instance and default options.
    expect(setupCacheMock).toHaveBeenCalledTimes(1);
    expect(setupCacheMock).toHaveBeenCalledWith(
      baseInstance,
      expect.objectContaining({
        interpretHeader: true,
        staleIfError: true,
        ttl: 1000 * 60 * 5, // 5 minutes
      }),
    );

    // The exported instance should be whatever setupCache returned.
    const returned = (
      setupCacheMock as unknown as {
        mock: { results: Array<{ value: unknown }> };
      }
    ).mock.results[0]?.value;
    expect(cachedAxios).toBe(returned);
    // And it should expose a request method (basic AxiosInstance surface)
    expect(typeof (cachedAxios as { request: unknown }).request).toBe(
      'function',
    );
  });

  test('uses the documented default TTL value (5 minutes)', async () => {
    await import('./cachedAxios');
    const [, options] = setupCacheMock.mock.calls[0] as [
      unknown,
      { ttl: number },
    ];
    expect(options.ttl).toBe(300_000);
  });
});
