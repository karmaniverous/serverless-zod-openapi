// External
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import middy from '@middy/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// Internal
import { createApiGatewayV1Event, createLambdaContext } from '@/test/aws';
import { buildMiddlewareStack } from './stack';

// Helper that preserves correct event typing
const run = async (
  base: (e: APIGatewayProxyEvent, c: Context) => Promise<unknown>,
  opts: Parameters<typeof buildMiddlewareStack>[0],
  event: APIGatewayProxyEvent,
  ctx: Context,
) => {
  const wrapped = middy(base).use(buildMiddlewareStack(opts));
  return wrapped(event, ctx);
};

// Robust normalization: accept shaped or raw, string or object body
const getJsonBody = (res: unknown): unknown => {
  if (res && typeof res === 'object' && 'statusCode' in res) {
    const shaped = res as { body?: unknown };
    const body = shaped.body;
    if (typeof body === 'string') {
      try {
        return JSON.parse(body);
      } catch {
        return body;
      }
    }
    return body;
  }
  return res;
};

describe('stack: response shaping & content-type header', () => {
  it('sets Content-Type and preserves payload as JSON', async () => {
    const base = async () => ({
      statusCode: 200,
      headers: {},
      body: { ok: true },
    });

    const event = createApiGatewayV1Event('GET');
    event.headers = { ...event.headers, Accept: 'application/json' };
    const ctx: Context = createLambdaContext();

    const result = await run(
      base,
      { contentType: 'application/json' },
      event,
      ctx,
    );

    expect(getJsonBody(result)).toEqual({ ok: true });
  });
});

describe('stack: Zod errors are exposed as 400', () => {
  it('maps a thrown ZodError to statusCode 400 and JSON body', async () => {
    const base = async () => {
      z.object({ k: z.string() }).parse([]); // throws
      return { statusCode: 200, headers: {}, body: {} };
    };

    const event = createApiGatewayV1Event('GET');
    event.headers = { ...event.headers, Accept: 'application/json' };
    const ctx: Context = createLambdaContext();

    const result = (await run(
      base,
      { contentType: 'application/json' },
      event,
      ctx,
    )) as {
      statusCode: number;
      headers: Record<string, string>;
      body: string | object;
    };

    expect(result.statusCode).toBe(400);
    expect(result.headers['Content-Type']).toBe('application/json');
    const parsed = getJsonBody(result);
    expect(parsed).toBeTruthy();
  });
});

describe('stack: POST + JSON body is accepted', () => {
  it('returns 200 and JSON payload', async () => {
    const base = async (e: APIGatewayProxyEvent, ctx: Context) => {
      // touch vars to satisfy strict unused-vars
      void e.path;
      void ctx.awsRequestId;
      return { statusCode: 200, headers: {}, body: { ok: true } };
    };

    const event = createApiGatewayV1Event('POST');
    event.headers = {
      ...event.headers,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    event.body = JSON.stringify({ hello: 'world' });

    const ctx: Context = createLambdaContext();

    const result = await run(
      base,
      { contentType: 'application/json' },
      event,
      ctx,
    );

    expect(getJsonBody(result)).toEqual({ ok: true });
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
    event.headers = { ...event.headers, Accept: 'application/json' };
    const ctx: Context = createLambdaContext();

    const result = (await run(
      base,
      { contentType: 'application/json' },
      event,
      ctx,
    )) as {
      statusCode: number;
      headers: Record<string, string>;
      body: string | object;
    };

    expect(result.statusCode).toBe(200);
    const body = getJsonBody(result);
    expect(body).toEqual({});
  });
});
