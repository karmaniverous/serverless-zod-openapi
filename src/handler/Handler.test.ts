import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { eventSchema, responseSchema } from '@/endpoints/foo/get/schema';
import { createApiGatewayV1Event, createLambdaContext } from '@/test/aws';
import type {eventSchema, responseSchema AllParams } from '@/test/stages';
import type { ConsoleLogger } from '@/types/Loggable';

import type { Handler, HandlerOptions, InferEvent } from './Handler';
import type { SecurityContext } from './SecurityContext';

type Keys = 'SERVICE_NAME' | 'PROFILE';

describe('Handler.ts types (using fixture schemas)', () => {
  it('InferEvent overrides APIGatewayProxyEvent fields with fixture eventSchema', () => {
    type E = InferEvent<typeof eventSchema>;

    // Still has the base APIGatewayProxyEvent shape
    expectTypeOf<E>().toExtend<APIGatewayProxyEvent>();

    // But queryStringParameters is overridden by the schema’s shape
    expectTypeOf<E['queryStringParameters']>().toEqualTypeOf<{
      what?: string;
      answer?: number;
    }>();
  });

  it('Handler signature matches expected param & return types', () => {
    type H = Handler<
      typeof eventSchema,
      typeof responseSchema,
      AllParams,
      Keys,
      ConsoleLogger
    >;

    // Parameters: [event, context, options]
    expectTypeOf<Parameters<H>>().toEqualTypeOf<
      [
        InferEvent<typeof eventSchema>,
        Context,
        HandlerOptions<AllParams, Keys, ConsoleLogger>,
      ]
    >();

    // Return: Promise<output<typeof responseSchema>>
    expectTypeOf<ReturnType<H>>().toEqualTypeOf<Promise<{ what: string }>>();
  });

  it('A concrete implementation type-checks and runs', async () => {
    // Concrete handler using the fixture schemas
    const impl: Handler<
      typeof eventSchema,
      typeof responseSchema,
      AllParams,
      Keys,
      ConsoleLogger
    > = async (_event, _ctx, _opts) => {
      return { what: 'ok' };
    };

    // Build a V1 event and enrich it to satisfy the fixture event schema
    const base = createApiGatewayV1Event('GET');
    const event = {
      ...base,
      // Matches fixture event schema (overrides the base type in InferEvent)
      queryStringParameters: { what: 'life', answer: 42 },
    } as InferEvent<typeof eventSchema>;

    const ctx = createLambdaContext();

    const env: Pick<AllParams, Keys> = {
      SERVICE_NAME: 'svc',
      PROFILE: 'dev',
    };

    const logger: ConsoleLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    };

    const sec: SecurityContext = 'public';

    const res = await impl(event, ctx, { env, logger, securityContext: sec });
    expect(res).toEqual({ what: 'ok' });
  });
});
