import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createApiGatewayV1Event, createLambdaContext } from '@/test/aws';

import { buildMiddlewareStack } from './stack';

// Helper that preserves correct event typing (avoid 'unknown' issues)
const run = async (
  base: (e: APIGatewayProxyEvent, c: Context) => Promise<unknown>,
  opts: Parameters<typeof buildMiddlewareStack>[0],
  event: APIGatewayProxyEvent,
  ctx: Context,
) => {
  const wrapped = middy(base).use(buildMiddlewareStack(opts));
  return wrapped(event, ctx);
};

describe('stack: response shaping & content-type header', () => {
  it('sets Content-Type and serializes body to JSON', async () => {
    const base = async () => ({
      statusCode: 200,
      headers: {},
      body: { ok: true },
    });

    const event = createApiGatewayV1Event('GET');
    const ctx: Context = createLambdaContext();

    const result = (await run(
      base,
      { contentType: 'application/json' },
      event,
      ctx,
    )) as { statusCode: number; headers: Record<string, string>; body: string };

    expect(result.statusCode).toBe(200);
    expect(result.headers['Content-Type']).toBe('application/json');
    expect(result.body).toBe(JSON.stringify({ ok: true }));
  });
});

describe('stack: Zod errors are exposed as 400', () => {
  it('maps a thrown ZodError to statusCode 400', async () => {
    const base = async () => {
      z.object({ k: z.string() }).parse([]); // throws
      return { statusCode: 200, headers: {}, body: {} };
    };

    const event = createApiGatewayV1Event('GET');
    const ctx: Context = createLambdaContext();

    const result = (await run(
      base,
      { contentType: 'application/json' },
      event,
      ctx,
    )) as { statusCode: number; headers: Record<string, string>; body: string };

    expect(result.statusCode).toBe(400);
    expect(result.headers['Content-Type']).toBe('application/json');

    // Body is JSON string; don't depend on exact shape
    const parsed = JSON.parse(result.body) as { message?: unknown };
    expect(parsed).toBeTruthy();
  });
});

describe('stack: POST + JSON body is accepted', () => {
  it('returns 200 with serialized JSON body', async () => {
    const base = async (e: APIGatewayProxyEvent, _c: Context) => {
      // touch event to avoid unused lint
      void e.path;
      return { statusCode: 200, headers: {}, body: { ok: true } };
    };

    const event = createApiGatewayV1Event('POST');
    event.headers = {
      ...(event.headers ?? {}),
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
    )) as { statusCode: number; headers: Record<string, string>; body: string };

    expect(result.statusCode).toBe(200);
    expect(result.headers['Content-Type']).toBe('application/json');
    expect(result.body).toBe(JSON.stringify({ ok: true }));
  });
});

describe('stack: HEAD short-circuit shapes empty JSON body', () => {
  it('returns 200 and "{}"', async () => {
    const base = async () => ({
      statusCode: 200,
      headers: {},
      body: { shouldBeIgnored: true },
    });

    const event = createApiGatewayV1Event('HEAD');
    const ctx: Context = createLambdaContext();

    const result = (await run(
      base,
      { contentType: 'application/json' },
      event,
      ctx,
    )) as { statusCode: number; headers: Record<string, string>; body: string };

    expect(result.statusCode).toBe(200);
    expect(result.headers['Content-Type']).toBe('application/json');
    expect(result.body).toBe('{}');
  });
});
