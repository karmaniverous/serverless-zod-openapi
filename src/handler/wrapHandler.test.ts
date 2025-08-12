import type { Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createApiGatewayV1Event, createLambdaContext } from '@/test/aws';
import type { ConsoleLogger } from '@/types/Loggable';

import { makeWrapHandler } from './wrapHandler';

// Define minimal env schemas locally (do NOT import production); keep them
// consistent with the test fixture's AllParams keys you actually use here.
const gSchema = z.object({
  SERVICE_NAME: z.string(),
  PROFILE: z.string(),
});
const sSchema = gSchema.partial().extend({
  STAGE: z.string(),
  DOMAIN_NAME: z.string(),
});

const globalEnv = ['SERVICE_NAME', 'PROFILE'] as const;
const stageEnv = ['STAGE', 'DOMAIN_NAME'] as const;

const eventSchema = z.object({
  // keep empty overlay for simplicity; real fields not needed for this test
});
const responseSchema = z.object({
  what: z.string(),
});

describe('wrapHandler (happy path, GET)', () => {
  it('returns handler body when validation passes and env is present', async () => {
    // Arrange env expected by the schema picks
    process.env.SERVICE_NAME = 'svc';
    process.env.PROFILE = 'dev';
    process.env.STAGE = 'test';
    process.env.DOMAIN_NAME = 'example.test';

    // Build the wrapper runtime
    const wrap = makeWrapHandler({
      globalParamsSchema: gSchema,
      stageParamsSchema: sSchema,
      globalEnv,
      stageEnv,
    });

    const logger: ConsoleLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    };

    const wrapped = wrap(
      // Business handler returns only the response payload (per Handler.ts)
      async () => {
        return { what: 'ok' };
      },
      {
        eventSchema,
        responseSchema,
        logger,
      },
    );

    const event = createApiGatewayV1Event('GET');
    const ctx: Context = createLambdaContext();

    // Act
    const res = await wrapped(event, ctx);

    // Assert: body-only contract from our business handler
    expect(res).toEqual({ what: 'ok' });
  });
});

describe('wrapHandler (HEAD short-circuit)', () => {
  it('skips the business handler and returns a shaped HEAD response', async () => {
    const wrap = makeWrapHandler({
      globalParamsSchema: gSchema,
      stageParamsSchema: sSchema,
      globalEnv,
      stageEnv,
    });

    const handler = vi.fn(async () => {
      // should NOT be called for HEAD
      return { what: 'nope' };
    });

    const wrapped = wrap(handler, { eventSchema, responseSchema });

    const event = createApiGatewayV1Event('HEAD');
    const ctx: Context = createLambdaContext();

    const res = await wrapped(event, ctx);

    // Short-circuit middleware creates a minimal shaped response
    expect(typeof (res as { statusCode?: unknown }).statusCode).toBe('number');
    expect((res as { statusCode: number }).statusCode).toBe(200);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('wrapHandler (POST, JSON body)', () => {
  it('accepts JSON body when Content-Type is application/json', async () => {
    process.env.SERVICE_NAME = 'svc';
    process.env.PROFILE = 'dev';
    process.env.STAGE = 'test';
    process.env.DOMAIN_NAME = 'example.test';

    const wrap = makeWrapHandler({
      globalParamsSchema: gSchema,
      stageParamsSchema: sSchema,
      globalEnv,
      stageEnv,
    });

    const logger: ConsoleLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    };

    const wrapped = wrap(async () => ({ what: 'ok' }), {
      eventSchema,
      responseSchema,
      logger,
    });

    const event = createApiGatewayV1Event('POST');
    event.headers = {
      ...(event.headers ?? {}),
      'Content-Type': 'application/json',
    };
    event.body = JSON.stringify({});

    const ctx: Context = createLambdaContext();
    const res = await wrapped(event, ctx);
    expect(res).toEqual({ what: 'ok' });
  });
});
