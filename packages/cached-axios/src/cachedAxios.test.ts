import { describe, expect, test, vi } from 'vitest';

// Prepare controlled mocks BEFORE importing the module under test.
const baseInstance = { request: vi.fn() };

vi.mock('axios', () => ({
  default: { create: vi.fn(() => baseInstance) },
}));

const setupCacheMock = vi.fn(
  (base: unknown, opts: Record<string, unknown>) => ({
    request: vi.fn(),
    _base: base,
    _opts: opts,
  }),
);

vi.mock('axios-cache-interceptor', () => ({
  setupCache: setupCacheMock,
}));

describe('cachedAxios', () => {
  test('wraps axios.create() with axios-cache-interceptor using expected defaults', async () => {
    // Import AFTER mocks so the module factory runs with our fakes.
    const { cachedAxios } = await import('./cachedAxios');

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
    const returned = setupCacheMock.mock.results[0]?.value as {
      request: unknown;
      _opts: Record<string, unknown>;
    };
    expect(cachedAxios).toBe(returned);
    // And it should expose a request method (basic AxiosInstance surface)
    expect(typeof (cachedAxios as { request: unknown }).request).toBe(
      'function',
    );
  });
});
