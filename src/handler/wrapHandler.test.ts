import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { globalEnv, stageEnv } from '@/serverless/stages/env';
import {
  createApiGatewayV1Event as createEvent,
  createLambdaContext as createContext,
} from '@/test/aws';
import { synthesizeEnvForSuccess, withTempEnv } from '@/test/env';
import { expectHttpJson } from '@/test/http';

import { detectSecurityContext } from './detectSecurityContext';
import { wrapHandler } from './wrapHandler';

describe('wrapHandler (Vitest, Zod v4, ESLint-clean, no local mocks)', () => {
  it('short-circuits HEAD but middleware serializes an empty JSON response', async () => {
    let called = false;
    const base = async () => {
      called = true;
      return {};
    };

    const wrapped = wrapHandler(base, {
      eventSchema: z.object({}),
      responseSchema: z.object({}).strip(),
      envKeys: [] as const,
    });

    const res = await wrapped(createEvent('HEAD'), createContext());
    expect(called).toBe(false);
    expectHttpJson(res, {});
  });

  it('assembles env, injects securityContext, logs env, and returns serialized JSON', async () => {
    let capturedEnv: Record<string, unknown> | undefined;
    let capturedSec: unknown;

    const customLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    };

    const base = async (
      event: unknown,
      _ctx: Context,
      injected: {
        env: Record<string, unknown>;
        logger: typeof customLogger;
        securityContext: unknown;
      },
    ) => {
      capturedEnv = injected.env;
      capturedSec = injected.securityContext;

      const expected = detectSecurityContext(event as APIGatewayProxyEvent);
      expect(capturedSec).toEqual(expected);
      expect(injected.logger).toBe(customLogger);

      return { ok: true };
    };

    const wrapped = wrapHandler(base, {
      eventSchema: z.object({}),
      responseSchema: z.object({ ok: z.boolean() }),
      logger: customLogger,
      envKeys: ['ESB_MINIFY', 'ESB_SOURCEMAP'] as const,
    });

    const envVars = synthesizeEnvForSuccess();
    const res = await withTempEnv(envVars, () =>
      wrapped(
        createEvent('GET', { Accept: 'application/json' }),
        createContext(),
      ),
    );

    expectHttpJson(res, { ok: true });
    expect(customLogger.debug).toHaveBeenCalledWith('env', expect.any(Object));

    // Assert presence of at least one known global and stage key
    const someGlobal = globalEnv[0];
    expect(
      Object.prototype.hasOwnProperty.call(
        capturedEnv as Record<string, unknown>,
        someGlobal,
      ),
    ).toBe(true);

    const someStage = stageEnv[0];
    expect(
      Object.prototype.hasOwnProperty.call(
        capturedEnv as Record<string, unknown>,
        someStage,
      ),
    ).toBe(true);
  });

  it('passes contentType through to stack: default vs custom', async () => {
    const base = async () => ({ ok: true });

    const wrappedDefault = wrapHandler(base, {
      eventSchema: z.object({}),
      responseSchema: z.object({ ok: z.boolean() }),
    });

    const wrappedCustom = wrapHandler(base, {
      eventSchema: z.object({}),
      responseSchema: z.object({ ok: z.boolean() }),
      contentType: 'application/vnd.api+json',
    });

    const envVars = synthesizeEnvForSuccess();

    const r1 = await withTempEnv(envVars, () =>
      wrappedDefault(createEvent('GET'), createContext()),
    );
    expectHttpJson(r1, { ok: true }, 'application/json');

    const r2 = await withTempEnv(envVars, () =>
      wrappedCustom(createEvent('GET'), createContext()),
    );
    expectHttpJson(r2, { ok: true }, 'application/vnd.api+json');
  });

  it('auto-detects multipart: non-multipart passes; multipart with boundary also passes', async () => {
    const base = async () => ({ ok: true });
    const wrapped = wrapHandler(base, {
      eventSchema: z.object({}),
      responseSchema: z.object({ ok: z.boolean() }),
    });
    const envVars = synthesizeEnvForSuccess();

    // Non-multipart
    const r1 = await withTempEnv(envVars, () =>
      wrapped(createEvent('POST'), createContext()),
    );
    expectHttpJson(r1, { ok: true });

    // Multipart with boundary
    const headers = {
      'Content-Type': 'multipart/form-data; boundary=----VitestBoundary',
    };
    const event = {
      ...createEvent('POST', headers),
      body: '------VitestBoundary--',
    };
    const r2 = await withTempEnv(envVars, () =>
      wrapped(event as APIGatewayProxyEvent, createContext()),
    );
    expectHttpJson(r2, { ok: true });
  });

  it('propagates schema/env validation failures as error responses (base not called)', async () => {
    let called = false;
    const base = async () => {
      called = true;
      return { ok: true };
    };

    const wrapped = wrapHandler(base, {
      eventSchema: z.object({}),
      responseSchema: z.object({ ok: z.boolean() }),
    });

    // Intentionally incomplete env to trigger failure
    const badEnv = Object.fromEntries(
      [...globalEnv, ...stageEnv].slice(0, 2).map((k) => [k, '']),
    );

    const res = await withTempEnv(badEnv, () =>
      wrapped(createEvent('GET'), createContext()),
    );
    const status = (res as { statusCode?: number }).statusCode ?? 0;

    expect(status).toBeGreaterThanOrEqual(400);
    expect(called).toBe(false);
  });

  it('defaults to console logger when none provided', async () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const base = async () => ({ ok: true });

    const wrapped = wrapHandler(base, {
      eventSchema: z.object({}),
      responseSchema: z.object({ ok: z.boolean() }),
    });

    const envVars = synthesizeEnvForSuccess();

    await withTempEnv(envVars, () =>
      wrapped(createEvent('GET'), createContext()),
    );
    expect(consoleSpy).toHaveBeenCalledWith('env', expect.any(Object));
    consoleSpy.mockRestore();
  });
});

