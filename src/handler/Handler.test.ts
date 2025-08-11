import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type { AllParams } from '@/test/stages';
import type { ConsoleLogger } from '@/types/Loggable';

import type {
  Handler,
  HandlerOptions,
  HandlerReturn,
  InferEvent,
} from './Handler';
import type { SecurityContext } from './SecurityContext';

describe('Handler.ts types', () => {
  it('InferEvent merges APIGatewayProxyEvent with Zod output (additive fields)', () => {
    const eventSchema = z.object({ foo: z.string() });
    // value-use to satisfy no-unused-vars when used in type positions
    void eventSchema;

    type E = InferEvent<typeof eventSchema>;
    expectTypeOf<E>().toExtend<APIGatewayProxyEvent & { foo: string }>();
  });

  it('InferEvent allows Zod output to override overlapping keys', () => {
    // Zod v4: z.record requires key + value schemas
    const eventSchema = z.object({ headers: z.record(z.string(), z.string()) });
    void eventSchema;

    type E = InferEvent<typeof eventSchema>;
    // headers from InferEvent should equal Record<string, string>
    expectTypeOf<E['headers']>().toEqualTypeOf<Record<string, string>>();
  });

  it('HandlerReturn resolves to Promise<z.output<ResponseSchema>> when schema is provided', () => {
    const responseSchema = z.object({ ok: z.boolean() });
    void responseSchema;

    type R = HandlerReturn<typeof responseSchema>;
    expectTypeOf<R>().toEqualTypeOf<Promise<{ ok: boolean }>>();
  });

  it('HandlerReturn resolves to Promise<unknown> when ResponseSchema is undefined', () => {
    type R = HandlerReturn<undefined>;
    expectTypeOf<R>().toEqualTypeOf<Promise<unknown>>();
  });

  it('HandlerOptions.env is an exact Pick across provided keys, and includes logger & securityContext', () => {
    type Keys = Extract<keyof AllParams, 'SERVICE_NAME' | 'STAGE'>;

    type Env = HandlerOptions<AllParams, Keys, ConsoleLogger>['env'];
    expectTypeOf<Env>().toEqualTypeOf<Pick<AllParams, Keys>>();

    type Sec = HandlerOptions<
      AllParams,
      Keys,
      ConsoleLogger
    >['securityContext'];
    expectTypeOf<Sec>().toExtend<SecurityContext>();

    type L = HandlerOptions<AllParams, Keys, ConsoleLogger>['logger'];
    expectTypeOf<L>().toExtend<ConsoleLogger>();
  });

  it('Handler ties event, response, env keys, and logger together coherently', () => {
    const eventSchema = z.object({ foo: z.string() });
    const responseSchema = z.object({ ok: z.boolean() });
    void eventSchema;
    void responseSchema;

    type Keys = Extract<keyof AllParams, 'SERVICE_NAME' | 'STAGE'>;
    type H = Handler<
      typeof eventSchema,
      typeof responseSchema,
      Keys,
      ConsoleLogger
    >;

    // Concrete value satisfying H; consume params to keep ESLint happy
    const impl: H = async (event, ctx, opts) => {
      void event;
      void ctx;
      void opts;
      return { ok: true };
    };

    expect(impl).toBeDefined();

    expectTypeOf<Parameters<H>>().toEqualTypeOf<
      [
        InferEvent<typeof eventSchema>,
        Context,
        HandlerOptions<AllParams, Keys, ConsoleLogger>,
      ]
    >();
    expectTypeOf<ReturnType<H>>().toEqualTypeOf<Promise<{ ok: boolean }>>();
  });
});
