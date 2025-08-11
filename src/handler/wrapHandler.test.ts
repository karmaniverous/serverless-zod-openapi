import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { mapEntries, shake } from 'radash';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { globalEnv, stageEnv } from '@/serverless/stages/env';
import { globalParamsSchema } from '@/serverless/stages/globalSchema';
import { stageParamsSchema } from '@/serverless/stages/stageSchema';

import { detectSecurityContext } from './detectSecurityContext';
import { buildEnvSchema, deriveAllKeys, splitKeysBySchema } from './envBuilder';
import { wrapHandler } from './wrapHandler';

/* ------------------------------ helpers ------------------------------ */

const createEvent = (
  method: string,
  headers?: Record<string, string>,
): APIGatewayProxyEvent =>
  ({
    httpMethod: method,
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
      httpMethod: method,
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

const createContext = (): Context =>
  ({
    awsRequestId: 'test-req-id',
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'fn',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn',
    logGroupName: 'lg',
    logStreamName: 'ls',
    memoryLimitInMB: '128',
    getRemainingTimeInMillis: () => 1000,
    done: () => undefined,
    fail: () => undefined,
    succeed: () => undefined,
  }) as unknown as Context;

/**
 * Set env vars using radash `shake` to drop only `undefined` keys.
 */
const withTempEnv = async <T>(
  vars: Record<string, string | undefined>,
  run: () => T | Promise<T>,
): Promise<T> => {
  const original = { ...process.env };
  process.env = shake({ ...original, ...vars }) as NodeJS.ProcessEnv;
  try {
    return await run();
  } finally {
    process.env = original;
  }
};

/** Build the same env schema the wrapper uses and synthesize string values that pass it. */
const synthesizeEnvForSuccess = (): Record<string, string> => {
  const allKeys = deriveAllKeys(globalEnv, stageEnv, [] as const);
  const { globalPick, stagePick } = splitKeysBySchema(
    allKeys,
    globalParamsSchema,
    stageParamsSchema,
  );
  const envSchema = buildEnvSchema(
    globalPick,
    stagePick,
    globalParamsSchema,
    stageParamsSchema,
  );

  if (!(envSchema instanceof z.ZodObject)) {
    throw new Error('Expected env schema to be a ZodObject');
  }

  const candidates: readonly string[] = [
    'us-east-1',
    'test',
    'dev',
    'prod',
    'true',
    'false',
    '1',
    '0',
    'application/json',
    'x',
  ];

  const tryCandidates = (schema: z.ZodType): string => {
    if (schema instanceof z.ZodEnum) return String(schema.options[0] ?? 'x');
    if (schema instanceof z.ZodLiteral) {
      const val = (schema as unknown as { value: unknown }).value;
      return String(val);
    }
    for (const c of candidates) {
      if (schema.safeParse(c).success) return c;
    }
    return 'x';
  };

  return mapEntries(envSchema.shape, (key, schema) => [
    key,
    tryCandidates(schema as unknown as z.ZodType),
  ]) as Record<string, string>;
};

const expectHttpJson = (
  res: unknown,
  expectedBody: unknown,
  expectedContentType = 'application/json',
): void => {
  const r = res as {
    statusCode?: number;
    body?: unknown;
    headers?: Record<string, string>;
  };
  expect(r.statusCode).toBe(200);
  const headers = r.headers ?? {};
  const ct = headers['Content-Type'] ?? headers['content-type'];
  expect(ct).toBe(expectedContentType);
  const bodyStr = typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
  expect(bodyStr).toBe(JSON.stringify(expectedBody));
};

/* -------------------------------- tests ------------------------------ */

describe('wrapHandler (Vitest, Zod v4, ESLint-clean, no local mocks)', () => {
  it('short-circuits HEAD but middleware serializes an empty JSON response', async () => {
    let called = false;
    const base = async () => {
      called = true;
      return {};
    };

    const wrapped = wrapHandler(base, {
      eventSchema: z.object({}),
      responseSchema: z.object({}).strip(),
      envKeys: [] as const,
    });

    const res = await wrapped(createEvent('HEAD'), createContext());
    expect(called).toBe(false);
    expectHttpJson(res, {});
  });

  it('assembles env, injects securityContext, logs env, and returns serialized JSON', async () => {
    let capturedEnv: Record<string, unknown> | undefined;
    let capturedSec: unknown;

    const customLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    };

    const base = async (
      event: unknown,
      _ctx: Context,
      injected: {
        env: Record<string, unknown>;
        logger: typeof customLogger;
        securityContext: unknown;
      },
    ) => {
      capturedEnv = injected.env;
      capturedSec = injected.securityContext;

      const expected = detectSecurityContext(event as APIGatewayProxyEvent);
      expect(capturedSec).toEqual(expected);
      expect(injected.logger).toBe(customLogger);

      return { ok: true };
    };

    const wrapped = wrapHandler(base, {
      eventSchema: z.object({}),
      responseSchema: z.object({ ok: z.boolean() }),
      logger: customLogger,
      envKeys: ['ESB_MINIFY', 'ESB_SOURCEMAP'] as const,
    });

    const envVars = synthesizeEnvForSuccess();
    const res = await withTempEnv(envVars, () =>
      wrapped(
        createEvent('GET', { Accept: 'application/json' }),
        createContext(),
      ),
    );

    expectHttpJson(res, { ok: true });
    expect(customLogger.debug).toHaveBeenCalledWith('env', expect.any(Object));

    // Assert presence of at least one known global and stage key
    const someGlobal = globalEnv[0];
    expect(
      Object.prototype.hasOwnProperty.call(
        capturedEnv as Record<string, unknown>,
        someGlobal,
      ),
    ).toBe(true);

    const someStage = stageEnv[0];
    expect(
      Object.prototype.hasOwnProperty.call(
        capturedEnv as Record<string, unknown>,
        someStage,
      ),
    ).toBe(true);
  });

  it('passes contentType through to stack: default vs custom', async () => {
    const base = async () => ({ ok: true });

    const wrappedDefault = wrapHandler(base, {
      eventSchema: z.object({}),
      responseSchema: z.object({ ok: z.boolean() }),
    });

    const wrappedCustom = wrapHandler(base, {
      eventSchema: z.object({}),
      responseSchema: z.object({ ok: z.boolean() }),
      contentType: 'application/vnd.api+json',
    });

    const envVars = synthesizeEnvForSuccess();

    const r1 = await withTempEnv(envVars, () =>
      wrappedDefault(createEvent('GET'), createContext()),
    );
    expectHttpJson(r1, { ok: true }, 'application/json');

    const r2 = await withTempEnv(envVars, () =>
      wrappedCustom(createEvent('GET'), createContext()),
    );
    expectHttpJson(r2, { ok: true }, 'application/vnd.api+json');
  });

  it('auto-detects multipart: non-multipart passes; multipart with boundary also passes', async () => {
    const base = async () => ({ ok: true });
    const wrapped = wrapHandler(base, {
      eventSchema: z.object({}),
      responseSchema: z.object({ ok: z.boolean() }),
    });
    const envVars = synthesizeEnvForSuccess();

    // Non-multipart
    const r1 = await withTempEnv(envVars, () =>
      wrapped(createEvent('POST'), createContext()),
    );
    expectHttpJson(r1, { ok: true });

    // Multipart with boundary
    const headers = {
      'Content-Type': 'multipart/form-data; boundary=----VitestBoundary',
    };
    const event = {
      ...createEvent('POST', headers),
      body: '------VitestBoundary--',
    };
    const r2 = await withTempEnv(envVars, () =>
      wrapped(event as APIGatewayProxyEvent, createContext()),
    );
    expectHttpJson(r2, { ok: true });
  });

  it('propagates schema/env validation failures as error responses (base not called)', async () => {
    let called = false;
    const base = async () => {
      called = true;
      return { ok: true };
    };

    const wrapped = wrapHandler(base, {
      eventSchema: z.object({}),
      responseSchema: z.object({ ok: z.boolean() }),
    });

    // Intentionally incomplete env to trigger failure
    const badEnv = Object.fromEntries(
      [...globalEnv, ...stageEnv].slice(0, 2).map((k) => [k, '']),
    );

    const res = await withTempEnv(badEnv, () =>
      wrapped(createEvent('GET'), createContext()),
    );
    const status = (res as { statusCode?: number }).statusCode ?? 0;

    expect(status).toBeGreaterThanOrEqual(400);
    expect(called).toBe(false);
  });

  it('defaults to console logger when none provided', async () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const base = async () => ({ ok: true });

    const wrapped = wrapHandler(base, {
      eventSchema: z.object({}),
      responseSchema: z.object({ ok: z.boolean() }),
    });

    const envVars = synthesizeEnvForSuccess();

    await withTempEnv(envVars, () =>
      wrapped(createEvent('GET'), createContext()),
    );
    expect(consoleSpy).toHaveBeenCalledWith('env', expect.any(Object));
    consoleSpy.mockRestore();
  });
});

