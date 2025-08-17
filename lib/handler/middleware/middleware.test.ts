/* REQUIREMENTS ADDRESSED (TEST)
- Validate middleware stack behavior: content-type header, HEAD short-circuit, and Zod error mapping (HTTP-only; no internal mode).
- Tests should not rely on unsafe stringification; prefer explicit type checks.
*/
import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createApiGatewayV1Event, createLambdaContext } from '@@/lib/test/aws';

import { buildHttpMiddlewareStack } from './buildHttpMiddlewareStack';

const run = async (
  base: (e: APIGatewayProxyEvent, c: Context) => Promise<unknown>,
  opts: Parameters<typeof buildHttpMiddlewareStack>[0],
  event: APIGatewayProxyEvent,
  ctx: Context,
): Promise<unknown> => {
  const stack = buildHttpMiddlewareStack(opts);
  const wrapped = middy(async (e, c) => base(e, c)).use(stack);
  return wrapped(event, ctx);
};

describe('stack: response shaping & content-type header', () => {
  it('sets Content-Type and preserves payload as JSON', async () => {
    const event = createApiGatewayV1Event('GET', {
      Accept: 'application/json',
    });
    const ctx = createLambdaContext();

    const result = (await run(
      async () => ({ hello: 'world' }),
      {
        contentType: 'application/json',
        eventSchema: z.object({}),
        responseSchema: z.object({ hello: z.string() }),
      },
      event,
      ctx,
    )) as {
      statusCode: number;
      headers: Record<string, string>;
      body: string | object;
    };

    expect(result.statusCode).toBe(200);
    const contentType =
      result.headers['Content-Type'] ?? result.headers['content-type'] ?? '';
    expect(contentType.toLowerCase()).toMatch(/application\/json/);
    const body =
      typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
    expect(body).toEqual({ hello: 'world' });
  });
});

describe('stack: HEAD short-circuit', () => {
  it('responds 200 {} with Content-Type', async () => {
    const event = createApiGatewayV1Event('HEAD', {
      Accept: 'application/json',
    });
    const ctx = createLambdaContext();

    const result = (await run(
      async () => ({ ignored: true }),
      {
        contentType: 'application/json',
        eventSchema: z.object({}),
        responseSchema: z.object({}).optional(),
      },
      event,
      ctx,
    )) as {
      statusCode: number;
      headers: Record<string, string>;
      body: string | object;
    };

    expect(result.statusCode).toBe(200);
    const contentType =
      result.headers['Content-Type'] ?? result.headers['content-type'] ?? '';
    expect(contentType.toLowerCase()).toMatch(/application\/json/);
    const body =
      typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
    expect(body).toEqual({});
  });
});

describe('stack: pre-shaped response', () => {
  it('preserves statusCode/body/headers and sets Content-Type', async () => {
    const event = createApiGatewayV1Event('POST', {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
    const ctx = createLambdaContext();

    const result = await run(
      async (_e) => ({
        statusCode: 201,
        headers: { 'X-Thing': 'y' },
        body: 'raw',
      }),
      {
        eventSchema: z.object({}),
        responseSchema: undefined,
      },
      event,
      ctx,
    );

    const http = result as unknown as {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
    };
    expect(http.statusCode).toBe(201);
    expect(http.headers['X-Thing'] ?? http.headers['x-thing']).toBe('y');
    expect(
      (
        (http.headers['Content-Type'] ?? http.headers['content-type']) as string
      ).toLowerCase(),
    ).toMatch(/application\/json/);
    expect(http.body).toBe('raw');
  });
});
