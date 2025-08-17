import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createApiGatewayV1Event, createLambdaContext } from '@@/lib/test/aws';

import { buildMiddlewareStack } from './buildStack';

const run = async (
  base: (e: APIGatewayProxyEvent, c: Context) => Promise<unknown>,
  opts: Parameters<typeof buildMiddlewareStack>[0],
  event: APIGatewayProxyEvent,
  ctx: Context,
) => {
  const wrapped = middy(base).use(buildMiddlewareStack(opts));
  return wrapped(event, ctx);
};

const getJsonBody = (res: {
  statusCode: number;
  headers: Record<string, string>;
  body: string | object;
}) => {
  const contentType =
    res.headers['Content-Type'] ?? res.headers['content-type'];
  if (typeof res.body === 'string' && /json/i.test(contentType)) {
    return JSON.parse(res.body) as unknown;
  }
  return res.body;
};

describe('stack: response shaping & content-type header', () => {
  it('sets Content-Type and preserves payload as JSON', async () => {
    const event = createApiGatewayV1Event('GET', {
      Accept: 'application/json',
    });
    const ctx = createLambdaContext();

    const base = async () => ({ hello: 'world' });

    const result = (await run(
      base,
      {
        contentType: 'application/json',
        eventSchema: z.object({}).optional() as unknown as z.ZodType, // no-op
        responseSchema: z.object({ hello: z.string() }),
      } as unknown as Parameters<typeof buildMiddlewareStack>[0],
      event,
      ctx,
    )) as {
      statusCode: number;
      headers: Record<string, string>;
      body: string | object;
    };

    expect(result.statusCode).toBe(200);
    expect(
      (
        result.headers['Content-Type'] ?? result.headers['content-type']
      ).toLowerCase(),
    ).toMatch(/application\/json/);

    expect(getJsonBody(result)).toEqual({ hello: 'world' });
  });
});

describe('stack: Zod errors are exposed as 400', () => {
  it('maps a thrown ZodError to statusCode 400 and JSON body', async () => {
    const event = createApiGatewayV1Event('GET', {
      Accept: 'application/json',
    });
    const ctx = createLambdaContext();

    const base = async () => {
      // throw a typical ZodError-ish object
      throw Object.assign(new Error('Invalid input'), {
        name: 'ZodError',
        issues: [],
      });
    };

    const result = (await run(
      base,
      {
        contentType: 'application/json',
        eventSchema: z.object({}).optional() as unknown as z.ZodType, // no-op
        responseSchema: z.string().optional() as unknown as z.ZodType, // no-op
      } as unknown as Parameters<typeof buildMiddlewareStack>[0],
      event,
      ctx,
    ).catch((e: unknown) => e)) as {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
    };

    expect(result.statusCode).toBe(400);
    const body = getJsonBody(result);
    expect(typeof body).toBe('string'); // error message stringified by http-error-handler
  });
});

describe('stack: HEAD short-circuit shapes empty JSON body', () => {
  it('returns 200 and "{}"', async () => {
    const event = createApiGatewayV1Event('HEAD', {
      Accept: 'application/json',
    });
    const ctx = createLambdaContext();

    const base = async () => ({ hello: 'world' });

    const result = (await run(
      base,
      {
        contentType: 'application/json',
        eventSchema: z.object({}),
        responseSchema: z.object({ hello: z.string() }),
      } as unknown as Parameters<typeof buildMiddlewareStack>[0],
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

describe('stack: internal mode', () => {
  it('returns raw handler result and skips HTTP shaping', async () => {
    const event = createApiGatewayV1Event('GET', {
      Accept: 'application/json',
    });
    const ctx = createLambdaContext();
    const base = async () => 'value';

    const result = await run(
      base,
      {
        contentType: 'application/json',
        internal: true,
      } as unknown as Parameters<typeof buildMiddlewareStack>[0],
      event,
      ctx,
    );

    expect(result).toBe('value');
  });

  it('enforces response schema and reports Zod issues', async () => {
    const event = createApiGatewayV1Event('GET', {
      Accept: 'application/json',
    });
    const ctx = createLambdaContext();
    const base = async () => ({ nope: true });

    let threw = false;
    try {
      await run(
        base,
        {
          contentType: 'application/json',
          internal: true,
          responseSchema: z.object({ ok: z.boolean() }),
        } as unknown as Parameters<typeof buildMiddlewareStack>[0],
        event,
        ctx,
      );
    } catch (e) {
      threw = true;

      // Best effort: detect validation-ish shape
      if (e && typeof e === 'object') {
        const msg = String((e as { message?: unknown }).message ?? '');
        const hasInvalidOk = /invalid\s+response/i.test(msg);
        expect(hasInvalidOk).toBe(true);
      } else {
        // Fallback: ensure the thrown value mentions validation
        expect(String(e)).toMatch(/invalid/i);
      }
    }

    expect(threw).toBe(true);
  });

  it('does not JSON-parse the request body in internal mode', async () => {
    const event = createApiGatewayV1Event('POST', {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
    (event as { body?: string | undefined }).body = JSON.stringify({
      hello: 'world',
    });

    const ctx = createLambdaContext();

    const base = async (evt: unknown) => {
      // raw event expected; body stays a string
      const body = (evt as { body?: unknown }).body;
      expect(typeof body).toBe('string');
      return body;
    };

    const result = await run(
      base,
      {
        contentType: 'application/json',
        internal: true,
      } as unknown as Parameters<typeof buildMiddlewareStack>[0],
      event,
      ctx,
    );

    expect(typeof result).toBe('string');
  });
});
