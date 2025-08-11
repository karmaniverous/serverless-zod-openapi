import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createApiGatewayV1Event as createEvent } from '@/test/aws';
import { expectResponse, type HttpResponse } from '@/test/http';

// --- mock non-local dependency (@middy/http-multipart-body-parser)
// Use vi.hoisted so Vitest can hoist safely.
const hoisted = vi.hoisted(() => ({
  beforeSpy: vi.fn(async () => {}),
}));

vi.mock('@middy/http-multipart-body-parser', () => ({
  default: () => ({ before: hoisted.beforeSpy }),
}));

import { buildMiddlewareStack } from './stack';

/* ------------------------------ helpers ------------------------------ */

type MiddyReq = {
  event: APIGatewayProxyEvent;
  response?: HttpResponse;
  error?: unknown;
};

const createStack = (contentType = 'application/json') =>
  buildMiddlewareStack({
    eventSchema: z.object({}).strip(),
    responseSchema: z.object({ ok: z.boolean() }).optional(),
    contentType,
  });

/* -------------------------------- tests ------------------------------ */

describe('middleware/stack', () => {
  it('after(): serializes object with custom content type', async () => {
    const stack = createStack('application/vnd.api+json');

    const req: MiddyReq = {
      event: createEvent('POST'),
      response: { ok: true } as unknown as HttpResponse, // will be replaced
    };

    await stack.after?.(req as never);

    const r = expectResponse(req);
    expect(r.statusCode).toBe(200);
    expect(r.headers['Content-Type']).toBe('application/vnd.api+json');
    expect(r.body).toBe(JSON.stringify({ ok: true }));
  });

  it('after(): serializes string body as-is', async () => {
    const stack = createStack();
    const req: MiddyReq = {
      event: createEvent('POST'),
      response: 'plain' as unknown as HttpResponse,
    };

    await stack.after?.(req as never);

    const r = expectResponse(req);
    expect(r.statusCode).toBe(200);
    expect(r.headers['Content-Type']).toBe('application/json');
    expect(r.body).toBe('plain');
  });

  it('after(): passes through when response already shaped', async () => {
    const stack = createStack();
    const shaped: HttpResponse = {
      statusCode: 201,
      headers: { 'Content-Type': 'text/plain' },
      body: 'ok',
    };
    const req: MiddyReq = { event: createEvent('POST'), response: shaped };

    await stack.after?.(req as never);
    expect(req.response).toBe(shaped);
  });

  it('before(): validates event with Zod and throws on failure', async () => {
    const strictStack = buildMiddlewareStack({
      eventSchema: z.object({ must: z.literal('yes') }),
      responseSchema: undefined,
      contentType: 'application/json',
    });

    const req: MiddyReq = { event: createEvent('POST') };
    await expect(strictStack.before?.(req as never)).rejects.toBeInstanceOf(
      z.ZodError,
    );
  });

  it('after(): validates response with Zod and maps error to 400 via onError', async () => {
    // response must have { ok: boolean }
    const stack = buildMiddlewareStack({
      eventSchema: z.object({}).strip(),
      responseSchema: z.object({ ok: z.boolean() }),
      contentType: 'application/json',
    });

    const req: MiddyReq = {
      event: createEvent('POST'),
      // invalid shape -> should fail response schema
      response: { nope: 1 } as unknown as HttpResponse,
    };

    // middy would catch the thrown error and call onError; replicate that
    try {
      await stack.after?.(req as never);
      throw new Error('after() should have thrown a ZodError');
    } catch (e) {
      req.error = e;
    }

    await stack.onError?.(req as never);

    const r = expectResponse(req);
    expect(r.statusCode).toBe(400);
    // keep default json content type
    expect(r.headers['Content-Type']).toBe('application/json');
    const msg = z.object({ message: z.string() }).parse(JSON.parse(r.body));
    expect(typeof msg.message).toBe('string');
  });

  it.skip('before(): runs multipart parser only for multipart requests', async () => {
    hoisted.beforeSpy.mockClear();

    const stack = createStack();

    // Not multipart
    const req1: MiddyReq = {
      event: createEvent('POST', { 'Content-Type': 'application/json' }),
    };
    await stack.before?.(req1 as never);
    expect(hoisted.beforeSpy).not.toHaveBeenCalled();

    // Multipart with boundary
    const req2: MiddyReq = {
      event: createEvent('POST', {
        'Content-Type': 'multipart/form-data; boundary=----VitestBoundary',
      }),
    };
    await stack.before?.(req2 as never);
    expect(hoisted.beforeSpy).toHaveBeenCalledTimes(1);
  });

  it('onError(): maps ZodError to 400, generic to 500, preserves content type', async () => {
    const stack = createStack('application/vnd.api+json');

    // ZodError -> 400
    const req1: MiddyReq = {
      event: createEvent('POST'),
      error: new z.ZodError([]),
    };
    await stack.onError?.(req1 as never);
    const r1 = expectResponse(req1);
    expect(r1.statusCode).toBe(400);
    expect(r1.headers['Content-Type']).toBe('application/vnd.api+json');
    const msg1 = z.object({ message: z.string() }).parse(JSON.parse(r1.body));
    expect(typeof msg1.message).toBe('string');

    // Generic -> 500
    const req2: MiddyReq = {
      event: createEvent('POST'),
      error: new Error('boom'),
    };
    await stack.onError?.(req2 as never);
    const r2 = expectResponse(req2);
    expect(r2.statusCode).toBe(500);
    expect(r2.headers['Content-Type']).toBe('application/vnd.api+json');
    const msg2 = z.object({ message: z.string() }).parse(JSON.parse(r2.body));
    expect(msg2.message).toBe('boom');
  });
});
