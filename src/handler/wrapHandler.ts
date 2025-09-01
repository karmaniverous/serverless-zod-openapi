/**
 * wrapHandler
 * - No glue: accepts a branded functionConfig and a business handler.
 *   Env (schemas + envKeys) is read from the branded config.
 * - Preserves HTTP/Non-HTTP split and middleware pipeline.
 */
import middy from '@middy/core';
import type { Context } from 'aws-lambda';
import type { z, ZodObject, ZodRawShape } from 'zod';

import type { EnvAttached } from '@/src/handler/defineFunctionConfig';
import { getEnvFromFunctionConfig } from '@/src/handler/defineFunctionConfig';
import {
  buildEnvSchema,
  deriveAllKeys,
  parseTypedEnv,
  splitKeysBySchema,
} from '@/src/handler/envBuilder';
import { buildHttpMiddlewareStack } from '@/src/handler/middleware/buildHttpMiddlewareStack';
import type { BaseEventTypeMap } from '@/src/types/BaseEventTypeMap';
import type { FunctionConfig } from '@/src/types/FunctionConfig';
import type { Handler, ShapedEvent } from '@/src/types/Handler';
import { isHttpEventTypeToken } from '@/src/types/HttpEventTokens';

export function wrapHandler<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
  StageParamsSchema extends ZodObject<ZodRawShape>,
  EventTypeMap extends BaseEventTypeMap,
  EventType extends keyof EventTypeMap,
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
>(
  functionConfig: FunctionConfig<
    EventSchema,
    ResponseSchema,
    z.infer<GlobalParamsSchema>,
    z.infer<StageParamsSchema>,
    EventTypeMap,
    EventType
  > &
    EnvAttached<GlobalParamsSchema, StageParamsSchema>,
  business: Handler<EventSchema, ResponseSchema, EventTypeMap[EventType]>,
) {
  const assertKeysSubset = (
    schema: ZodObject<ZodRawShape>,
    keys: readonly string[],
    label: string,
  ): void => {
    const allowed = new Set(Object.keys(schema.shape));
    const bad = keys.filter((k) => !allowed.has(k));
    if (bad.length)
      throw new Error(`${label} contains unknown keys: ${bad.join(', ')}`);
  };
  const envConfig = getEnvFromFunctionConfig<
    GlobalParamsSchema,
    StageParamsSchema
  >(functionConfig);
  assertKeysSubset(
    envConfig.global.paramsSchema,
    envConfig.global.envKeys as readonly string[],
    'global.envKeys',
  );
  assertKeysSubset(
    envConfig.stage.paramsSchema,
    envConfig.stage.envKeys as readonly string[],
    'stage.envKeys',
  );

  return async (event: unknown, context: Context) => {
    // Compose typed env schema and parse process.env
    const all = deriveAllKeys(
      envConfig.global.envKeys as readonly PropertyKey[],
      envConfig.stage.envKeys as readonly PropertyKey[],
      (functionConfig.fnEnvKeys ?? []) as readonly PropertyKey[],
    );
    const { globalPick, stagePick } = splitKeysBySchema(
      all,
      envConfig.global.paramsSchema,
      envConfig.stage.paramsSchema,
    );
    const envSchema = buildEnvSchema(
      globalPick,
      stagePick,
      envConfig.global.paramsSchema,
      envConfig.stage.paramsSchema,
    );
    const env = parseTypedEnv(
      envSchema,
      process.env as Record<string, unknown>,
    );
    const logger = console;

    // Non-HTTP: call business directly
    if (
      !isHttpEventTypeToken(functionConfig.eventType as keyof BaseEventTypeMap)
    ) {
      return business(
        event as ShapedEvent<EventSchema, EventTypeMap[EventType]>,
        context,
        { env, logger },
      );
    }

    // HTTP: build middleware stack
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

    const wrapped = middy(async (e: unknown, c: Context) =>
      business(e as ShapedEvent<EventSchema, EventTypeMap[EventType]>, c, {
        env,
        logger,
      }),
    ).use(http);

    return wrapped(event as never, context);
  };
}
