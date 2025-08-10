import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { wrapHandler } from './wrapHandler';

/** Minimal event/context builders (keep them tiny; we don't mock local deps). */
const makeEvent = (method: string): APIGatewayProxyEvent =>
  ({ httpMethod: method }) as unknown as APIGatewayProxyEvent;

const makeContext = (): Context =>
  ({ awsRequestId: 'req-1' }) as unknown as Context;

/**
 * Temporarily set env vars for a single operation.
 * Avoids dynamic delete; restores the original snapshot afterwards.
 */
const withEnv = <T>(
  vars: Record<string, string | undefined>,
  run: () => Promise<T> | T,
): Promise<T> => {
  const saved = { ...process.env };
  Object.entries(vars).forEach(([k, v]) => {
    (process.env as Record<string, string | undefined>)[k] = v;
  });
  const p = Promise.resolve().then(run);
  return p.finally(() => {
    process.env = saved;
  });
};

describe('wrapHandler (integration with real deps)', () => {
  it('short-circuits HEAD requests (base handler not invoked)', async () => {
    let called = false;

    const wrapped = wrapHandler(
      async () => {
        called = true;
        return {};
      },
      {
        eventSchema: z.object({}),
        responseSchema: z.object({}), // returning {} is valid
        envKeys: [] as const,
      },
    );

    const event = makeEvent('HEAD') as unknown as Parameters<typeof wrapped>[0];
    const ctx = makeContext() as unknown as Parameters<typeof wrapped>[1];

    const res = await wrapped(event, ctx);

    expect(called).toBe(false);
    expect(res).toEqual({});
  });

  it('builds env from global + stage + function keys and passes it to the handler', async () => {
    let capturedEnv: Record<string, unknown> | undefined;

    const wrapped = wrapHandler(
      async (_event, _ctx, { env, securityContext }) => {
        capturedEnv = env;
        expect(typeof securityContext).toBe('object');
        return { ok: true };
      },
      {
        eventSchema: z.object({}),
        responseSchema: z.object({ ok: z.boolean() }),
        envKeys: ['PROFILE', 'TEST_STAGE_ENV'] as const,
      },
    );

    const event = makeEvent('GET') as unknown as Parameters<typeof wrapped>[0];
    const ctx = makeContext() as unknown as Parameters<typeof wrapped>[1];

    const res = await withEnv(
      {
        SERVICE_NAME: 'svc',
        REGION: 'ap-southeast-1',
        PROFILE: 'dev-profile',
        TEST_GLOBAL_ENV: 'g-env',
        STAGE: 'dev',
        TEST_STAGE_ENV: 's-env',
      },
      () => wrapped(event, ctx),
    );

    expect(res).toEqual({ ok: true });
    expect(capturedEnv).toEqual({
      SERVICE_NAME: 'svc',
      REGION: 'ap-southeast-1',
      PROFILE: 'dev-profile',
      TEST_GLOBAL_ENV: 'g-env',
      STAGE: 'dev',
      TEST_STAGE_ENV: 's-env',
    });
  });

  it('returns a 500-style response when a required env var is missing', async () => {
    const wrapped = wrapHandler(
      async () => {
        // should not be invoked; env parse fails first
        return { ok: true };
      },
      {
        eventSchema: z.object({}),
        responseSchema: z.object({ ok: z.boolean() }),
        envKeys: ['PROFILE'] as const,
      },
    );

    const event = makeEvent('GET') as unknown as Parameters<typeof wrapped>[0];
    const ctx = makeContext() as unknown as Parameters<typeof wrapped>[1];

    const res = await withEnv(
      {
        SERVICE_NAME: 'svc',
        REGION: 'ap-southeast-1',
        TEST_GLOBAL_ENV: 'g-env',
        STAGE: 'dev',
        PROFILE: undefined, // required by envKeys; omitted on purpose
      },
      () => wrapped(event, ctx),
    );

    const out = res as {
      statusCode?: number;
      headers?: Record<string, string>;
    };
    expect(typeof out.statusCode).toBe('number');
    expect(out.statusCode).toBe(500);
  });

  it('applies multipart parser only when enableMultipart=true (expect 415 when enabled without Content-Type)', async () => {
    const wrapped = wrapHandler(async () => ({ ok: true }), {
      eventSchema: z.object({}),
      responseSchema: z.object({ ok: z.boolean() }),
      envKeys: [] as const,
      enableMultipart: true,
    });

    const event = makeEvent('POST') as unknown as Parameters<typeof wrapped>[0];
    const ctx = makeContext() as unknown as Parameters<typeof wrapped>[1];

    const res = await withEnv(
      {
        SERVICE_NAME: 'svc',
        REGION: 'ap-southeast-1',
        TEST_GLOBAL_ENV: 'g-env',
        STAGE: 'dev',
        PROFILE: 'dev-profile',
      },
      () => wrapped(event, ctx),
    );

    const out = res as { statusCode?: number; body?: string };
    expect(out.statusCode).toBe(415); // Unsupported Media Type
  });

  it('does NOT apply multipart parser when enableMultipart=false (no 415)', async () => {
    const wrapped = wrapHandler(async () => ({ ok: true }), {
      eventSchema: z.object({}),
      responseSchema: z.object({ ok: z.boolean() }),
      envKeys: [] as const,
      // enableMultipart not set / false
    });

    const event = makeEvent('POST') as unknown as Parameters<typeof wrapped>[0];
    const ctx = makeContext() as unknown as Parameters<typeof wrapped>[1];

    const res = await withEnv(
      {
        SERVICE_NAME: 'svc',
        REGION: 'ap-southeast-1',
        TEST_GLOBAL_ENV: 'g-env',
        STAGE: 'dev',
        PROFILE: 'dev-profile',
      },
      () => wrapped(event, ctx),
    );

    // If multipart isn't enabled, we don't get the 415 from the multipart middleware.
    // Expect a normal serialized response.
    expect(res).toEqual({ ok: true });
  });

  it('uses the provided default contentType in the serialized response', async () => {
    const wrapped = wrapHandler(async () => ({ ok: true }), {
      eventSchema: z.object({}),
      responseSchema: z.object({ ok: z.boolean() }),
      envKeys: [] as const,
      contentType: 'application/vnd.api+json',
    });

    const event = makeEvent('GET') as unknown as Parameters<typeof wrapped>[0];
    const ctx = makeContext() as unknown as Parameters<typeof wrapped>[1];

    const res = await withEnv(
      {
        SERVICE_NAME: 'svc',
        REGION: 'ap-southeast-1',
        TEST_GLOBAL_ENV: 'g-env',
        STAGE: 'dev',
        PROFILE: 'dev-profile',
      },
      () => wrapped(event, ctx),
    );

    const out = res as { headers?: Record<string, string> };
    expect(out.headers?.['Content-Type']).toBe('application/vnd.api+json');
  });

  it('still short-circuits HEAD even when enableMultipart is true', async () => {
    let called = false;

    const wrapped = wrapHandler(
      async () => {
        called = true;
        return {};
      },
      {
        eventSchema: z.object({}),
        responseSchema: z.object({}),
        envKeys: [] as const,
        enableMultipart: true,
      },
    );

    const event = makeEvent('HEAD') as unknown as Parameters<typeof wrapped>[0];
    const ctx = makeContext() as unknown as Parameters<typeof wrapped>[1];

    const res = await withEnv(
      {
        SERVICE_NAME: 'svc',
        REGION: 'ap-southeast-1',
        TEST_GLOBAL_ENV: 'g-env',
        STAGE: 'dev',
        PROFILE: 'dev-profile',
      },
      () => wrapped(event, ctx),
    );

    expect(called).toBe(false);
    expect(res).toEqual({});
  });
});
