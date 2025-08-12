import type { Context } from 'aws-lambda';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { z } from 'zod';

import { createApiGatewayV1Event, createLambdaContext } from '@/test/aws';
import type { AllParams } from '@/test/stages';
import type { ConsoleLogger } from '@/types/Loggable';

import type { SecurityContext } from './detectSecurityContext';
import type { Handler, HandlerOptions, InferEvent } from './Handler';

// --- Test-local schemas (do NOT import production schemas)
const eventSchema = z.object({
  // Add a simple overlay that doesn't fight API GW v1:
  id: z.string(),
  // Keep optional extras to show the overlay works without affecting base fields
  q: z.string().optional(),
});

const responseSchema = z.object({
  ok: z.boolean(),
});

// Keys this handler needs from AllParams (subset of test fixtures)
type Keys = 'SERVICE_NAME' | 'PROFILE';

describe('Handler.ts types (with test-local schemas)', () => {
  it('Handler signature matches param & return types', () => {
    type H = Handler<
      typeof eventSchema,
      typeof responseSchema,
      AllParams,
      Keys,
      ConsoleLogger
    >;

    expectTypeOf<Parameters<H>>().toEqualTypeOf<
      [
        InferEvent<typeof eventSchema>,
        Context,
        HandlerOptions<AllParams, Keys, ConsoleLogger>,
      ]
    >();

    expectTypeOf<ReturnType<H>>().toEqualTypeOf<Promise<{ ok: boolean }>>();
  });

  it('Concrete implementation type-checks and runs', async () => {
    const impl: Handler<
      typeof eventSchema,
      typeof responseSchema,
      AllParams,
      Keys,
      ConsoleLogger
    > = async (_event, _ctx, _opts) => {
      return { ok: true };
    };

    // Build a v1 event and satisfy the test event schema
    const base = createApiGatewayV1Event('GET');
    const event: InferEvent<typeof eventSchema> = {
      ...base,
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
