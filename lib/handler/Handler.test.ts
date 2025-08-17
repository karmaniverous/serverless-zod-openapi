import type { Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createApiGatewayV1Event, createLambdaContext } from '@@/lib/test/aws';
import type { ConsoleLogger } from '@@/lib/types/Loggable';
import type { ShapedEvent } from '@@/lib/types/ShapedEvent';

import type { Handler, HandlerOptions } from '../types/Handler';

const eventSchema = z.object({
  id: z.string(),
  q: z.string().optional(),
});

const responseSchema = z.object({
  ok: z.boolean(),
});

void eventSchema;
void responseSchema;

describe('Handler type', () => {
  it('accepts (ShapedEvent<EventSchema>, Context, HandlerOptions) -> payload', async () => {
    const impl: Handler<typeof eventSchema, typeof responseSchema> = async (
      _event: ShapedEvent<typeof eventSchema>,
      _ctx: Context,
      _opts: HandlerOptions,
    ) => {
      void _event;
      void _ctx;
      void _opts;
      return { ok: true };
    };

    expect(
      await impl(
        {
          ...createApiGatewayV1Event('GET'),
          id: 'x',
        } as unknown as ShapedEvent<typeof eventSchema>,
        createLambdaContext(),
        {
          env: {},
          logger: {
            debug: vi.fn(),
            info: vi.fn(),
            error: vi.fn(),
            log: vi.fn(),
          } as unknown as ConsoleLogger,
        },
      ),
    ).toEqual({ ok: true });
  });
});
