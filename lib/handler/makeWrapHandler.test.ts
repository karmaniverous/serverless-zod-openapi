/* REQUIREMENTS ADDRESSED (TEST)
- Ensure `makeWrapHandler` produces HTTP-shaped responses for HTTP events (GET/HEAD/POST) and validates payloads.
- Ensure HEAD short-circuits and that content-type negotiation is respected.
*/
import type { Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createApiGatewayV1Event, createLambdaContext } from '@@/lib/test/aws';
import {
  globalEnvKeys,
  globalParamsSchema,
} from '@@/lib/test/serverless/config/global';
import {
  stageEnvKeys,
  stageParamsSchema,
} from '@@/lib/test/serverless/config/stage';
import type { ConsoleLogger } from '@@/lib/types/Loggable';

import { makeWrapHandler } from './makeWrapHandler';

const runtime = <
  G extends typeof globalParamsSchema,
  S extends typeof stageParamsSchema,
>(
  base: (event: unknown, ctx: Context) => Promise<unknown>,
  cfg: {
    contentType: string;
    eventSchema?: z.ZodType | undefined;
    responseSchema?: z.ZodType | undefined;
    fnEnvKeys: readonly (keyof z.infer<G> | keyof z.infer<S>)[];
    logger: ConsoleLogger;
  },
) => {
  const wrapped = makeWrapHandler({
    globalEnvKeys,
    globalParamsSchema,
    stageEnvKeys,
    stageParamsSchema,
  })(async (_evt, _ctx, _opts) => base(_evt, _ctx), {
    contentType: cfg.contentType,
    eventSchema: cfg.eventSchema,
    responseSchema: cfg.responseSchema,
    fnEnvKeys: cfg.fnEnvKeys,
    logger: cfg.logger,
  });

  return wrapped;
};

describe('wrapHandler: GET happy path', () => {
  it('returns the business payload when validation passes and env is present', async () => {
    const eventSchema = z.object({});
    const responseSchema = z.object({ what: z.string() });

    const logger: ConsoleLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    };

    const wrapped = runtime(async () => ({ what: 'ok' }), {
      contentType: 'application/json',
      eventSchema,
      responseSchema,
      fnEnvKeys: [],
      logger,
    });

    const event = createApiGatewayV1Event('GET', {
      Accept: 'application/json',
    });
    const ctx: Context = createLambdaContext();

    const res = (await wrapped(event, ctx)) as unknown as {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
    };

    expect(res.statusCode).toBe(200);
    expect(
      (
        res.headers['Content-Type'] ?? res.headers['content-type']
      ).toLowerCase(),
    ).toMatch(/application\/json/);
    expect(JSON.parse(res.body)).toEqual({ what: 'ok' });
  });
});

describe('wrapHandler: HEAD short-circuit', () => {
  it('skips the business handler and produces a shaped response with 200', async () => {
    const wrapped = runtime(
      async () => {
        throw new Error('should not run this');
      },
      {
        contentType: 'application/json',
        eventSchema: z.object({}),
        responseSchema: z.object({}),
        fnEnvKeys: [],
        logger,
      },
    );

    const event = createApiGatewayV1Event('HEAD', {
      Accept: 'application/json',
    });
    const ctx: Context = createLambdaContext();

    const res = (await wrapped(event, ctx)) as unknown as {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
    };

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type'] ?? res.headers['content-type']).toMatch(
      /application\/json/i,
    );
    // Body is shaped to "{}"
    expect(res.body).toBe('{}');
  });
});

describe('wrapHandler: POST with JSON body', () => {
  it('returns the business payload for application/json', async () => {
    const eventSchema = z.object({});
    const responseSchema = z.object({ what: z.string() });

    const logger: ConsoleLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    };

    const wrapped = runtime(
      async (_evt) => {
        return { what: 'ok' };
      },
      {
        contentType: 'application/json',
        eventSchema,
        responseSchema,
        fnEnvKeys: [],
        logger,
      },
    );

    const event = createApiGatewayV1Event('POST', {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
    const ctx: Context = createLambdaContext();

    const res = (await wrapped(event, ctx)) as unknown as {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
    };

    expect(res.statusCode).toBe(200);
    expect(
      (
        res.headers['Content-Type'] ?? res.headers['content-type']
      ).toLowerCase(),
    ).toMatch(/application\/json/);
    expect(JSON.parse(res.body)).toEqual({ what: 'ok' });
  });
});
