import type { Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { ConsoleLogger } from '@/src/types/Loggable';
import { createApiGatewayV1Event, createLambdaContext } from '@/test/aws';
import { globalEnvKeys, globalParamsSchema } from '@/test/stages/global';
import { stageEnvKeys, stageParamsSchema } from '@/test/stages/stage';

import { makeWrapHandler } from './makeWrapHandler';

const eventSchema = z.object({});
const responseSchema = z.object({ what: z.string() });

const normalize = (res: unknown): unknown => {
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

describe('wrapHandler: GET happy path', () => {
  it('returns the business payload when validation passes and env is present', async () => {
    process.env.SERVICE_NAME = 'svc';
    process.env.PROFILE = 'dev';
    process.env.STAGE = 'test';
    process.env.DOMAIN_NAME = 'example.test';

    const wrapHandler = makeWrapHandler({
      globalParamsSchema,
      stageParamsSchema,
      globalEnvKeys,
      stageEnvKeys,
    });

    const logger: ConsoleLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    };

    const wrapped = wrapHandler(async () => ({ what: 'ok' }), {
      eventSchema,
      responseSchema,
      logger,
    });

    const event = createApiGatewayV1Event('GET');
    event.headers = { ...event.headers, Accept: 'application/json' };

    const ctx: Context = createLambdaContext();
    const res = await wrapped(event, ctx);

    expect(normalize(res)).toEqual({ what: 'ok' });
  });
});

describe('wrapHandler: HEAD short-circuit', () => {
  it('skips the business handler and produces a shaped response with 200', async () => {
    const wrapHandler = makeWrapHandler({
      globalParamsSchema,
      stageParamsSchema,
      globalEnvKeys,
      stageEnvKeys,
    });

    const handler = vi.fn(async () => ({ what: 'nope' }));
    const wrapped = wrapHandler(handler, { eventSchema, responseSchema });

    const event = createApiGatewayV1Event('HEAD');
    event.headers = { ...event.headers, Accept: 'application/json' };

    const ctx: Context = createLambdaContext();
    const res = await wrapped(event, ctx);

    expect(res.statusCode).toBe(200);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('wrapHandler: POST with JSON body', () => {
  it('returns the business payload for application/json', async () => {
    process.env.SERVICE_NAME = 'svc';
    process.env.PROFILE = 'dev';
    process.env.STAGE = 'test';
    process.env.DOMAIN_NAME = 'example.test';

    const wrapHandler = makeWrapHandler({
      globalParamsSchema,
      stageParamsSchema,
      globalEnvKeys,
      stageEnvKeys,
    });

    const wrapped = wrapHandler(async () => ({ what: 'ok' }), {
      eventSchema,
      responseSchema,
      logger: console,
    });

    const event = createApiGatewayV1Event('POST');
    event.headers = {
      ...event.headers,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    event.body = JSON.stringify({ hello: 'world' });

    const ctx: Context = createLambdaContext();
    const res = await wrapped(event, ctx);

    expect(normalize(res)).toEqual({ what: 'ok' });
  });
});
