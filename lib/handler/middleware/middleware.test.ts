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
    expect(result.headers['Content-Type']).toBe('application/json');
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

describe('stack: preferred media types default', () => {
  it('defaults Accept to contentType across phases', async () => {
    const base = async () => ({ ok: true });

    const event = createApiGatewayV1Event('GET');
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

describe('stack: internal mode', () => {
  it('returns raw handler result and skips HTTP shaping', async () => {
    const base = async () => ({ ok: true });

    const event = createApiGatewayV1Event('GET');
    const ctx: Context = createLambdaContext();

    const result = await run(
      base,
      {
        contentType: 'application/json',
        internal: true,
        responseSchema: z.object({ ok: z.boolean() }),
      } as unknown as Parameters<typeof buildMiddlewareStack>[0],
      event,
      ctx,
    );

    expect(result).toEqual({ ok: true });
    expect(typeof (result as Record<string, unknown>).statusCode).toBe(
      'undefined',
    );
  });

  it('enforces response schema and reports Zod issues', async () => {
    const base = async () => ({ ok: 'nope' });

    const event = createApiGatewayV1Event('GET');
    const ctx: Context = createLambdaContext();

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
      // If we get here, validation did not run as expected
      expect(false).toBe(true);
    } catch (err) {
      const parseIssues = (
        e: unknown,
      ): Array<Record<string, unknown>> | null => {
        if (Array.isArray(e)) {
          return e as Array<Record<string, unknown>>;
        }
        if (typeof e === 'string') {
          try {
            const j = JSON.parse(e) as unknown;
            return Array.isArray(j)
              ? (j as Array<Record<string, unknown>>)
              : null;
          } catch {
            return null;
          }
        }
        if (
          e &&
          typeof e === 'object' &&
          'issues' in (e as Record<string, unknown>)
        ) {
          const maybe = (e as { issues?: unknown }).issues;
          return Array.isArray(maybe)
            ? (maybe as Array<Record<string, unknown>>)
            : null;
        }
        return null;
      };

      const issues = parseIssues(err);
      if (issues) {
        const hasInvalidOk = issues.some((i) => {
          const code = i['code'];
          const path = i['path'];
          return (
            code === 'invalid_type' && Array.isArray(path) && path[0] === 'ok'
          );
        });
        expect(hasInvalidOk).toBe(true);
      } else {
        // Fallback: ensure the thrown value mentions validation
        expect(String(err)).toMatch(/invalid|validation/i);
      }
    }
  });

  it('does not JSON-parse the request body in internal mode', async () => {
    const base = async (_e: APIGatewayProxyEvent) => _e.body;

    const event = createApiGatewayV1Event('POST');
    event.headers = {
      ...event.headers,
      'Content-Type': 'application/json',
    };
    event.body = JSON.stringify({ hello: 'world' });

    const ctx: Context = createLambdaContext();

    const result = await run(
      base,
      {
        contentType: 'application/json',
        internal: true,
        responseSchema: z.string(),
      } as unknown as Parameters<typeof buildMiddlewareStack>[0],
      event,
      ctx,
    );

    expect(typeof result).toBe('string');
    expect(result).toBe(event.body);
  });
});
