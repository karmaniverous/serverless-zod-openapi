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
import type { Handler } from '@@/lib/types/Handler';
import { isHttpEventTypeToken } from '@@/lib/types/HttpEventTokens';
import type { ConsoleLogger } from '@@/lib/types/Loggable';
import { globalEnvKeys, globalParamsSchema } from '@@/src/config/global';
import { stageEnvKeys, stageParamsSchema } from '@@/src/config/stage';

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
) => {
  const base = async (event: unknown, context: Context) => {
    // Build typed env
    const all = deriveAllKeys(
      globalEnvKeys as readonly string[],
      stageEnvKeys as readonly string[],
      (functionConfig.fnEnvKeys ?? []) as readonly string[],
    );
    const { globalPick, stagePick } = splitKeysBySchema(
      all,
      globalParamsSchema,
      stageParamsSchema,
    );
    const envSchema = buildEnvSchema(
      globalPick,
      stagePick,
      globalParamsSchema,
      stageParamsSchema,
    );
    const env = parseTypedEnv(
      envSchema,
      process.env as unknown as Record<string, unknown>,
    );

    // Decide whether to apply HTTP middleware
    const isHttp = isHttpEventTypeToken(
      functionConfig.eventType as keyof BaseEventTypeMap,
    );

    const logger: ConsoleLogger = functionConfig.logger ?? console;

    if (!isHttp) {
      // Non-HTTP: pass through to business handler with required options
      return business(event as never, context, { env, logger });
    }

    // HTTP: wrap with middleware (validation + content-type + HEAD handling)
    const http = buildHttpMiddlewareStack({
      eventSchema: functionConfig.eventSchema,
      responseSchema: functionConfig.responseSchema,
      contentType:
        (functionConfig as { contentType?: string }).contentType ??
        'application/json',
      logger,
    });

    const wrapped = middy(async (e, c) =>
      business(e as never, c, { env, logger }),
    ).use(http);
    return wrapped(event, context);
  };

  return base;
};
