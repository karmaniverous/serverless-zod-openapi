import middy from '@middy/core';
import type { Context } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createApiGatewayV1Event, createLambdaContext } from '@/test/aws';

import { buildMiddlewareStack } from './stack';

// Utilities
const run = async (
  base: (e: unknown, c: Context) => Promise<unknown>,
  opts: Parameters<typeof buildMiddlewareStack>[0],
  event: unknown,
  ctx: Context,
) => {
  const wrapped = middy(base).use(buildMiddlewareStack(opts));
  return wrapped(event, ctx);
};

describe('stack: response shaping and headers', () => {
  it('sets Content-Type on normal responses and preserves body', async () => {
    const defaultContentType = 'application/json';
    const base = async () => ({
      statusCode: 200,
      headers: {},
      body: { ok: true },
    });

    const event = createApiGatewayV1Event('GET');
    event.headers = { origin: 'https://example.com' };

    const ctx: Context = createLambdaContext();

    const result = (await run(
      base,
      { contentType: defaultContentType },
      event,
      ctx,
    )) as {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
    };

    expect(result.statusCode).toBe(200);
    expect(result.headers['Content-Type']).toBe(defaultContentType);
    // Body is serialized to JSON text
    expect(result.body).toBe(JSON.stringify({ ok: true }));
  });
});

describe('stack: Zod errors get exposed as 400', () => {
  it('maps ZodError to statusCode 400 and serializes error body', async () => {
    const base = async () => {
      // Force a ZodError without constructing it manually
      z.object({ k: z.string() }).parse([]); // throws
      return {};
    };

    const event = createApiGatewayV1Event('GET');
    const ctx: Context = createLambdaContext();

    const result = (await run(
      base,
      { contentType: 'application/json' },
      event,
      ctx,
    )) as {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
    };

    expect(result.statusCode).toBe(400);
    expect(result.headers['Content-Type']).toBe('application/json');

    // Body should be JSON string; avoid depending on exact shape
    const parsed = JSON.parse(result.body) as { message?: unknown };
    expect(
      typeof parsed.message === 'string' || typeof parsed.message === 'object',
    ).toBe(true);
  });
});

describe('stack: JSON body parsing and acceptable content-type', () => {
  it('accepts JSON content type and lets handler run', async () => {
    const base = async (_e: unknown, _c: Context) => ({
      statusCode: 200,
      headers: {},
      body: { ok: true },
    });

    const event = createApiGatewayV1Event('POST');
    event.headers = {
      ...(event.headers ?? {}),
      // Ensure we do not trigger 415 in ancillary checks
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    event.body = JSON.stringify({ hello: 'world' });

    const ctx: Context = createLambdaContext();

    const result = (await run(
      base,
      { contentType: 'application/json' },
      event,
      ctx,
    )) as {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
    };

    expect(result.statusCode).toBe(200);
    expect(result.headers['Content-Type']).toBe('application/json');
    expect(result.body).toBe(JSON.stringify({ ok: true }));
  });
});

describe('stack: HEAD short-circuit still shapes a JSON response', () => {
  it('returns 200 and an empty JSON object body', async () => {
    const base = async () => ({
      statusCode: 200,
      headers: {},
      body: { shouldNotAppear: true }, // should be ignored by short-circuit
    });

    const event = createApiGatewayV1Event('HEAD');

    const ctx: Context = createLambdaContext();

    const result = (await run(
      base,
      { contentType: 'application/json' },
      event,
      ctx,
    )) as {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
    };

    expect(result.statusCode).toBe(200);
    expect(result.headers['Content-Type']).toBe('application/json');
    // shortCircuitHead sets `{}` which the serializer turns into "{}"
    expect(result.body).toBe('{}');
  });
});
