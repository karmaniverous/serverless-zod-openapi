/**
 * REQUIREMENTS ADDRESSED (see /requirements.md)
 * - Anywhere `logger` is passed, it MUST satisfy ConsoleLogger; default to `console`.
 * - Wrapper builds env from global + stage config + fn allowlist.
 * - Avoid top-level imports of '@@/src/config/*' so Vitest hoisted mocks are honored.
 * - Never use dynamic *type* imports; runtime import is allowed.
 */
import middy from '@middy/core';
import type { Context } from 'aws-lambda';
import type { z, ZodObject, ZodRawShape } from 'zod';

import {
  buildEnvSchema,
  deriveAllKeys,
  parseTypedEnv,
  splitKeysBySchema,
} from '@@/lib/handler/envBuilder';
import { buildHttpMiddlewareStack } from '@@/lib/handler/middleware/buildHttpMiddlewareStack';
import type { BaseEventTypeMap } from '@@/lib/types/BaseEventTypeMap';
import type { FunctionConfig } from '@@/lib/types/FunctionConfig';
import type { Handler, ShapedEvent } from '@@/lib/types/Handler';
import { isHttpEventTypeToken } from '@@/lib/types/HttpEventTokens';
import type { ConsoleLogger } from '@@/lib/types/Loggable';

export type LoadEnvConfig<
  GP extends ZodObject<ZodRawShape>,
  SP extends ZodObject<ZodRawShape>,
> = () => Promise<{
  globalEnvKeys: readonly PropertyKey[];
  globalParamsSchema: GP;
  stageEnvKeys: readonly PropertyKey[];
  stageParamsSchema: SP;
}>;

/** Default runtime loader — allows tests to vi.mock the imported modules cleanly. */
const defaultLoadEnvConfig = async (): Promise<{
  globalEnvKeys: readonly PropertyKey[];
  globalParamsSchema: ZodObject<ZodRawShape>;
  stageEnvKeys: readonly PropertyKey[];
  stageParamsSchema: ZodObject<ZodRawShape>;
}> => {
  const [g, s] = await Promise.all([
    import('@@/src/config/global'),
    import('@@/src/config/stage'),
  ]);
  return {
    globalEnvKeys: (g as Record<string, unknown>)
      .globalEnvKeys as readonly PropertyKey[],
    globalParamsSchema: (g as Record<string, unknown>)
      .globalParamsSchema as ZodObject<ZodRawShape>,
    stageEnvKeys: (s as Record<string, unknown>)
      .stageEnvKeys as readonly PropertyKey[],
    stageParamsSchema: (s as Record<string, unknown>)
      .stageParamsSchema as ZodObject<ZodRawShape>,
  };
};
export const makeWrapHandler = <
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  GlobalParams extends ZodObject<ZodRawShape>,
  StageParams extends ZodObject<ZodRawShape>,
  EventTypeMap extends BaseEventTypeMap,
  EventType extends keyof EventTypeMap,
>(
  functionConfig: FunctionConfig<
    EventSchema,
    ResponseSchema,
    GlobalParams,
    StageParams,
    EventTypeMap,
    EventType
  >,
  business: Handler<EventSchema, ResponseSchema, EventTypeMap[EventType]>,
  loadEnvConfig: LoadEnvConfig<
    GlobalParams,
    StageParams
  > = defaultLoadEnvConfig as unknown as LoadEnvConfig<
    GlobalParams, StageParams
  >,
) => {
  const base = async (event: unknown, context: Context) => {
    // Load env config at runtime (mock-friendly).    const {
      globalEnvKeys,
      globalParamsSchema,
      stageEnvKeys,
      stageParamsSchema,
    } = await loadEnvConfig();

    // Union allowlists and split by schema ownership.
    const all = deriveAllKeys(
      globalEnvKeys,
      stageEnvKeys,
      (functionConfig.fnEnvKeys ?? []) as readonly PropertyKey[],
    );
    const { globalPick, stagePick } = splitKeysBySchema(
      all,
      globalParamsSchema,
      stageParamsSchema,
    );

    // Compose typed env schema & parse env.
    const envSchema = buildEnvSchema(
      globalPick,
      stagePick,
      globalParamsSchema,
      stageParamsSchema,
    );
    const env = parseTypedEnv(
      envSchema,
      process.env as Record<string, unknown>,
    );

    // Logger requirement: Console-compatible.
    const logger: ConsoleLogger = console;

    // If not HTTP-like, skip Middy shaping entirely.
    if (
      !isHttpEventTypeToken(functionConfig.eventType as keyof BaseEventTypeMap)
    ) {
      return business(
        event as ShapedEvent<EventSchema, EventTypeMap[EventType]>,
        context,
        { env, logger },
      );
    }

    // HTTP: build stack, including schemas only if defined (exactOptionalPropertyTypes).
    const http = buildHttpMiddlewareStack({
      ...(functionConfig.eventSchema
        ? { eventSchema: functionConfig.eventSchema }
        : {}),
      ...(functionConfig.responseSchema
        ? { responseSchema: functionConfig.responseSchema }
        : {}),
      contentType:
        (functionConfig as { contentType?: string }).contentType ??
        'application/json',
      logger,
    });

    // Wrap the business handler with the HTTP middleware stack.
    const wrapped = middy(async (e: unknown, c: Context) =>
      business(
        e as ShapedEvent<EventSchema, EventTypeMap[EventType]>,
        c,
        { env, logger },
      ),
    ).use(http);

    return wrapped(event as never, context);  };

  return base;
};
