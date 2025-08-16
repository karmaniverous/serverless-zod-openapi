import type { Context } from 'aws-lambda';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { z } from 'zod';

import { createApiGatewayV1Event, createLambdaContext } from '@@/lib/test/aws';
import type { AllParams } from '@@/lib/test/serverless/config/stages';
import type { HttpContext } from '@@/lib/types/HttpContext';
import type { ConsoleLogger } from '@@/lib/types/Loggable';
import type { ShapedEvent } from '@@/lib/types/ShapedEvent';

import type { Handler, HandlerOptions } from './Handler';

export const eventSchema = z.object({
  id: z.string(),
  q: z.string().optional(),
});

export const responseSchema = z.object({
  ok: z.boolean(),
});

type Keys = 'SERVICE_NAME' | 'PROFILE';

describe('Handler.ts (typed contract with test-local schemas)', () => {
  it('Handler signature matches parameter and return types', () => {
    type H = Handler<
      typeof eventSchema,
      typeof responseSchema,
      AllParams,
      Keys,
      ConsoleLogger
    >;

    expectTypeOf<Parameters<H>>().toEqualTypeOf<
      [
        ShapedEvent<typeof eventSchema>,
        Context,
        HandlerOptions<AllParams, Keys, ConsoleLogger>,
      ]
    >();

    expectTypeOf<ReturnType<H>>().toEqualTypeOf<Promise<{ ok: boolean }>>();

    // Use the schemas at runtime once to avoid "used only as a type" lint
    expect(eventSchema.parse({ id: 'x' })).toEqual({ id: 'x' });
    expect(responseSchema.parse({ ok: true })).toEqual({ ok: true });
  });

  it('Concrete implementation type-checks and runs end-to-end', async () => {
    const impl: Handler<
      typeof eventSchema,
      typeof responseSchema,
      AllParams,
      Keys,
      ConsoleLogger
    > = async (event, ctx, opts) => {
      void event.id;
      void ctx.awsRequestId;
      void opts.env;
      return { ok: true };
    };

    const event: ShapedEvent<typeof eventSchema> = {
      ...createApiGatewayV1Event('GET'),
      id: '123',
      q: 'hello',
    };

    const ctx: Context = createLambdaContext();

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

    const securityContext: HttpContext = 'public';

    const res = await impl(event, ctx, { env, logger, securityContext });
    expect(res).toEqual({ ok: true });
  });
});
