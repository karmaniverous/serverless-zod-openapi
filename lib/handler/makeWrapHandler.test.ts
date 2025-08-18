/* REQUIREMENTS ADDRESSED (TEST)
- Ensure `makeWrapHandler` produces HTTP-shaped responses for HTTP events (GET/HEAD/POST) and validates payloads.
- Ensure HEAD short-circuits and that content-type negotiation is respected.
- Ensure wrapper reads env via mocked production config modules.
*/
import type { Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { makeFunctionConfig } from '@@/lib/handler/makeFunctionConfig';
import { makeWrapHandler } from '@@/lib/handler/makeWrapHandler';
import { createApiGatewayV1Event, createLambdaContext } from '@@/lib/test/aws';
import {
  globalEnvKeys as testGlobalEnvKeys,
  globalParamsSchema as testGlobalParamsSchema,
} from '@@/lib/test/serverless/config/global';
import {
  stageEnvKeys as testStageEnvKeys,
  stageParamsSchema as testStageParamsSchema,
} from '@@/lib/test/serverless/config/stage';
import type { ConsoleLogger } from '@@/lib/types/Loggable';

vi.mock('@@/src/config/global', () => ({
  globalEnvKeys: testGlobalEnvKeys,
  globalParamsSchema: testGlobalParamsSchema,
}));
vi.mock('@@/src/config/stage', () => ({
  stageEnvKeys: testStageEnvKeys,
  stageParamsSchema: testStageParamsSchema,
}));

describe('wrapHandler: GET happy path', () => {
  it('returns the business payload when validation passes and env is present', async () => {
    // Ensure required env vars are set for validation
    process.env.SERVICE_NAME = 'testService';
    process.env.PROFILE = 'testProfile';
    process.env.STAGE = 'testStage';

    const eventSchema = z.object({});
    const responseSchema = z.object({ what: z.string() });

    const logger: ConsoleLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    };

    const functionConfig = makeFunctionConfig({
      eventType: 'rest',
      functionName: 'test_get',
      contentType: 'application/json',
      httpContexts: ['public'],
      method: 'get',
      basePath: 'test',
      eventSchema,
      responseSchema,
      fnEnvKeys: [],
      logger,
    });

    const handler = makeWrapHandler(functionConfig, async () => ({
      what: 'ok',
    }));

    const event = createApiGatewayV1Event('GET', {
      Accept: 'application/json',
    });
    const ctx: Context = createLambdaContext();

    const res = (await handler(event, ctx)) as unknown as {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
    };

    expect(res.statusCode).toBe(200);
    expect(
      (
        res.headers['Content-Type'] ??
        res.headers['content-type'] ??
        ''
      ).toLowerCase(),
    ).toMatch(/application\/json/);
    expect(JSON.parse(res.body)).toEqual({ what: 'ok' });
  });
});

describe('wrapHandler: HEAD short-circuit', () => {
  it('responds 200 {} with Content-Type', async () => {
    const eventSchema = z.object({});
    const responseSchema = z.object({}).optional();

    const functionConfig = makeFunctionConfig({
      eventType: 'rest',
      functionName: 'test_head',
      contentType: 'application/json',
      httpContexts: ['public'],
      method: 'head',
      basePath: 'test',
      eventSchema,
      responseSchema,
      fnEnvKeys: [],
    });

    const handler = makeWrapHandler(functionConfig, async () => ({
      ignored: true,
    }));

    const event = createApiGatewayV1Event('HEAD', {
      Accept: 'application/json',
    });
    const ctx: Context = createLambdaContext();

    const res = (await handler(event, ctx)) as unknown as {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
    };

    expect(res.statusCode).toBe(200);
    const contentType =
      res.headers['Content-Type'] ?? res.headers['content-type'] ?? '';
    expect(contentType.toLowerCase()).toMatch(/application\/json/);
    expect(JSON.parse(res.body)).toEqual({});
  });
});

describe('wrapHandler: POST payload', () => {
  it('JSON shapes response and validates body', async () => {
    const eventSchema = z.object({});
    const responseSchema = z.object({ what: z.string() });

    const logger: ConsoleLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    };

    const functionConfig = makeFunctionConfig({
      eventType: 'rest',
      functionName: 'test_post',
      contentType: 'application/json',
      httpContexts: ['public'],
      method: 'post',
      basePath: 'test',
      eventSchema,
      responseSchema,
      fnEnvKeys: [],
      logger,
    });

    const handler = makeWrapHandler(functionConfig, async () => {
      return { what: 'ok' };
    });

    const event = createApiGatewayV1Event('POST', {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
    const ctx: Context = createLambdaContext();

    const res = (await handler(event, ctx)) as unknown as {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
    };

    expect(res.statusCode).toBe(200);
    expect(
      (
        res.headers['Content-Type'] ??
        res.headers['content-type'] ??
        ''
      ).toLowerCase(),
    ).toMatch(/application\/json/);
    expect(JSON.parse(res.body)).toEqual({ what: 'ok' });
  });
});
