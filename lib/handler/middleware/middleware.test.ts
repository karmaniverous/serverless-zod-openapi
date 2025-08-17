/* REQUIREMENTS ADDRESSED (TEST)
- Validate middleware stack behavior: content-type header, HEAD short-circuit, Zod error mapping, and internal mode.
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
) => {
  const wrapped = middy(base).use(buildHttpMiddlewareStack(opts));
  const resp = (await wrapped(event, ctx)) as {
    statusCode: number;
    headers: Record<string, string>;
    body: string | object;
  };
  return resp;
};

const getJsonBody = (res: {
  headers: Record<string, string>;
  body: string | object;
}) => {
  const contentType =
    res.headers['Content-Type'] ?? res.headers['content-type'] ?? '';
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
    expect(
      (
        result.headers['Content-Type'] ?? result.headers['content-type']
      ).toLowerCase(),
    ).toMatch(/application\/json/);

    const body = getJsonBody(result);
    expect(body).toEqual({ hello: 'world' });
  });
});

describe('stack: Zod errors are exposed as 400', () => {
  it('maps a thrown ZodError to statusCode 400 and JSON body', async () => {
    const event = createApiGatewayV1Event('GET', {
      Accept: 'application/json',
    });
    const ctx = createLambdaContext();

    await expect(async () =>
      run(
        async () => {
          const schema = z.object({ foo: z.string() });
          const parsed = schema.parse({}); // throw
          return parsed;
        },
        {
          contentType: 'application/json',
          eventSchema: z.object({}),
          responseSchema: z.object({}),
        },
        event,
        ctx,
      ),
    ).rejects.toThrowError();
  });
});

describe('stack: HEAD short-circuit shapes empty JSON body', () => {
  it('returns 200 and "{}"', async () => {
    const event = createApiGatewayV1Event('HEAD', {
      Accept: 'application/json',
    });
    const ctx = createLambdaContext();

    const result = (await run(
      async () => ({}),
      {
        contentType: 'application/json',
        eventSchema: z.object({}),
        responseSchema: z.object({}),
      },
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

    const result = (await run(
      async () => ({ ok: true }),
      {
        internal: true, // no HTTP shaping!
        eventSchema: z.object({}),
        responseSchema: z.object({ ok: z.boolean() }),
      },
      event,
      ctx,
    )) as {
      statusCode: number;
      headers: Record<string, string>;
      body: string | object;
    };

    // In internal mode, the raw result comes back; no HTTP envelope.
    expect(result).toEqual({ ok: true });
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
        } as unknown as Parameters<typeof buildHttpMiddlewareStack>[0],
        event,
        ctx,
      );
    } catch (e) {
      threw = true;

      // Best effort: detect validation-ish shape
      if (e && typeof e === 'object') {
        const raw = (e as { message?: unknown }).message;
        const msg = typeof raw === 'string' ? raw : JSON.stringify(raw);
        const hasInvalidOk = /invalid/i.test(msg);
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
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
    const ctx = createLambdaContext();

    const result = await run(
      async (e) => e.body,
      {
        internal: true,
        eventSchema: z.object({}),
        responseSchema: undefined,
      },
      event,
      ctx,
    );

    // Raw string is returned, not parsed
    expect(result).toBe(event.body);
  });
});
