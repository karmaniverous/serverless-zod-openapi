import type { Context } from 'aws-lambda';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { z } from 'zod';

import { createApiGatewayV1Event, createLambdaContext } from '@/test/aws';
import type { AllParams } from '@/test/stages';
import type { ConsoleLogger } from '@/types/Loggable';

import type { SecurityContext } from './detectSecurityContext';
import type { Handler, HandlerOptions, InferEvent } from './Handler';

// --- Test-local schemas (do NOT import production)
const tEventSchema = z.object({
  id: z.string(),
  q: z.string().optional(),
});

const tResponseSchema = z.object({
  ok: z.boolean(),
});

// Keys this handler needs from AllParams (keep in sync with the fixture)
type Keys = 'SERVICE_NAME' | 'PROFILE';

describe('Handler.ts (typed contract using test-local schemas)', () => {
  it('Handler signature matches parameter and return types', () => {
    type H = Handler<
      typeof tEventSchema,
      typeof tResponseSchema,
      AllParams,
      Keys,
      ConsoleLogger
    >;

    expectTypeOf<Parameters<H>>().toEqualTypeOf<
      [
        InferEvent<typeof tEventSchema>,
        Context,
        HandlerOptions<AllParams, Keys, ConsoleLogger>,
      ]
    >();

    expectTypeOf<ReturnType<H>>().toEqualTypeOf<Promise<{ ok: boolean }>>();
  });

  it('Concrete implementation type-checks and runs end-to-end', async () => {
    const impl: Handler<
      typeof tEventSchema,
      typeof tResponseSchema,
      AllParams,
      Keys,
      ConsoleLogger
    > = async (_event, _ctx, _opts) => {
      return { ok: true };
    };

    // Build an API GW v1 event and satisfy the schema overlay
    const event: InferEvent<typeof tEventSchema> = {
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

    const securityContext: SecurityContext = 'public';

    const res = await impl(event, ctx, { env, logger, securityContext });
    expect(res).toEqual({ ok: true });
  });
});
