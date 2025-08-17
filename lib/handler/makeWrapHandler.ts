import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z, ZodObject, ZodRawShape } from 'zod';

import {
  detectSecurityContext,
  isV1,
  isV2,
} from '@@/lib/handler/detectSecurityContext';
import {
  buildEnvSchema,
  deriveAllKeys,
  parseTypedEnv,
  splitKeysBySchema,
} from '@@/lib/handler/envBuilder';
import type { Handler, WrappedHandler } from '@@/lib/handler/Handler';
import { buildMiddlewareStack } from '@@/lib/handler/middleware/buildStack';
import type { FunctionConfig } from '@@/lib/types/FunctionConfig';
import type { ConsoleLogger, Loggable } from '@@/lib/types/Loggable';
import type { ShapedEvent } from '@@/lib/types/ShapedEvent';

export type StagesRuntime<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
  GlobalEnvKeys extends readonly (keyof z.infer<GlobalParamsSchema>)[],
  StageParamsSchema extends ZodObject<ZodRawShape>,
  StageEnvKeys extends readonly (keyof z.infer<StageParamsSchema>)[],
> = {
  globalEnvKeys: GlobalEnvKeys;
  globalParamsSchema: GlobalParamsSchema;
  stageEnvKeys: StageEnvKeys;
  stageParamsSchema: StageParamsSchema;
};

export const makeWrapHandler = <
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
  const GlobalEnvKeys extends readonly (keyof z.infer<GlobalParamsSchema>)[],
  StageParamsSchema extends ZodObject<ZodRawShape>,
  const StageEnvKeys extends readonly (keyof z.infer<StageParamsSchema>)[],
>(
  cfg: StagesRuntime<
    GlobalParamsSchema,
    GlobalEnvKeys,
    StageParamsSchema,
    StageEnvKeys
  >,
) => {
  return <
    EventSchema extends z.ZodType | undefined,
    ResponseSchema extends z.ZodType | undefined,
    Logger extends ConsoleLogger,
  >(
    handler: Handler<EventSchema, ResponseSchema>,
    functionConfig: Partial<FunctionConfig<EventSchema, ResponseSchema>> &
      Partial<Loggable<Logger>>,
  ): WrappedHandler<ResponseSchema> => {
    const {
      contentType = 'application/json',
      eventSchema,
      responseSchema,
      fnEnvKeys: fnEnvKeysRaw = [],
      logger = console as unknown as Logger,
    } = functionConfig;

    const httpStack = buildMiddlewareStack<EventSchema, ResponseSchema, Logger>(
      {
        contentType,
        eventSchema,
        responseSchema,
        internal: false,
        logger,
      },
    );

    const internalStack = buildMiddlewareStack<
      EventSchema,
      ResponseSchema,
      Logger
    >({
      contentType,
      eventSchema,
      responseSchema,
      internal: true,
      logger,
    });

    const base = async (event: unknown, context: Context) => {
      const {
        globalEnvKeys,
        globalParamsSchema,
        stageEnvKeys,
        stageParamsSchema,
      } = cfg;

      const allKeys = deriveAllKeys(globalEnvKeys, stageEnvKeys, fnEnvKeysRaw);

      const { globalPick, stagePick } = splitKeysBySchema(
        allKeys,
        globalParamsSchema,
        stageParamsSchema,
      );

      const envSchema = buildEnvSchema(
        globalPick,
        stagePick,
        globalParamsSchema,
        stageParamsSchema,
      );

      const env = parseTypedEnv(envSchema, process.env);

      const isHttp = isV1(event) || isV2(event);

      const extras = isHttp
        ? {
            env,
            logger,
            securityContext: detectSecurityContext(
              event as APIGatewayProxyEvent,
            ),
          }
        : { env, logger };

      const result = await handler(
        event as ShapedEvent<EventSchema>,
        context,
        extras,
      );

      return result;
    };

    const httpWrapped = middy(base).use(httpStack);
    const internalWrapped = middy(base).use(internalStack);

    return async (event: unknown, context: Context) => {
      if (isV1(event) || isV2(event)) {
        return httpWrapped(event as APIGatewayProxyEvent, context);
      }
      return internalWrapped(event, context);
    };
  };
};
