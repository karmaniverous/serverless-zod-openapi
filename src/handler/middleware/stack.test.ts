import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

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

type HttpResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

type MiddyReq = {
  event: APIGatewayProxyEvent;
  response?: HttpResponse;
  error?: unknown;
};

const expectResponse = (req: MiddyReq): HttpResponse => {
  expect(req.response).toBeDefined();
  return req.response!;
};

const createEvent = (headers?: Record<string, string>): APIGatewayProxyEvent =>
  ({
    httpMethod: 'POST',
    headers: headers ?? {},
    body: undefined,
    isBase64Encoded: false,
    path: '/',
    queryStringParameters: null,
    pathParameters: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: '/',
    requestContext: {
      accountId: 'acc',
      apiId: 'api',
      httpMethod: 'POST',
      identity: {} as unknown,
      path: '/',
      stage: 'test',
      requestId: 'req',
      requestTimeEpoch: Date.now(),
      resourceId: 'res',
      resourcePath: '/',
      authorizer: {},
      protocol: 'HTTP/1.1',
    } as unknown,
  }) as unknown as APIGatewayProxyEvent;

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
      event: createEvent(),
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
      event: createEvent(),
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
    const req: MiddyReq = { event: createEvent(), response: shaped };

    await stack.after?.(req as never);
    expect(req.response).toBe(shaped);
  });

  it('before(): validates event with Zod and throws on failure', async () => {
    const strictStack = buildMiddlewareStack({
      eventSchema: z.object({ must: z.literal('yes') }),
      responseSchema: undefined,
      contentType: 'application/json',
    });

    const req: MiddyReq = { event: createEvent() };
    await expect(strictStack.before?.(req as never)).rejects.toBeInstanceOf(
      z.ZodError,
    );
  });

  it('before(): runs multipart parser only for multipart requests', async () => {
    hoisted.beforeSpy.mockClear();

    const stack = createStack();

    // Not multipart
    const req1: MiddyReq = {
      event: createEvent({ 'Content-Type': 'application/json' }),
    };
    await stack.before?.(req1 as never);
    expect(hoisted.beforeSpy).not.toHaveBeenCalled();

    // Multipart with boundary
    const req2: MiddyReq = {
      event: createEvent({
        'Content-Type': 'multipart/form-data; boundary=----VitestBoundary',
      }),
    };
    await stack.before?.(req2 as never);
    expect(hoisted.beforeSpy).toHaveBeenCalledTimes(1);
  });

  it('onError(): maps ZodError to 400, generic to 500, preserves content type', async () => {
    const stack = createStack('application/vnd.api+json');

    // ZodError -> 400
    const req1: MiddyReq = { event: createEvent(), error: new z.ZodError([]) };
    await stack.onError?.(req1 as never);
    const r1 = expectResponse(req1);
    expect(r1.statusCode).toBe(400);
    expect(r1.headers['Content-Type']).toBe('application/vnd.api+json');
    const msg1 = z.object({ message: z.string() }).parse(JSON.parse(r1.body));
    expect(typeof msg1.message).toBe('string');

    // Generic -> 500
    const req2: MiddyReq = { event: createEvent(), error: new Error('boom') };
    await stack.onError?.(req2 as never);
    const r2 = expectResponse(req2);
    expect(r2.statusCode).toBe(500);
    expect(r2.headers['Content-Type']).toBe('application/vnd.api+json');
    const msg2 = z.object({ message: z.string() }).parse(JSON.parse(r2.body));
    expect(msg2.message).toBe('boom');
  });
});
