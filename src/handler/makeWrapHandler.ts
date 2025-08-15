import middy from '@middy/core';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import type { z, ZodObject, ZodRawShape } from 'zod';

import { detectSecurityContext } from '@@/src/handler/detectSecurityContext';
import {
  buildEnvSchema,
  deriveAllKeys,
  parseTypedEnv,
  splitKeysBySchema,
} from '@@/src/handler/envBuilder';
import type { Handler } from '@@/src/handler/Handler';
import { buildMiddlewareStack } from '@@/src/handler/middleware/buildStack';
import type { ConsoleLogger, Loggable } from '@@/src/types/Loggable';
import type { ShapedEvent } from '@@/src/types/ShapedEvent';

type ProxyV1PromiseHandler = (
  event: APIGatewayProxyEvent,
  context: Context,
) => Promise<APIGatewayProxyResult>;

export type WrapHandlerOptions<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  AllParams extends Record<string, unknown>,
  FnEnvKeys extends readonly (keyof AllParams)[],
  Logger extends ConsoleLogger,
> = {
  contentType: string;
  enableMultipart?: boolean;
  eventSchema: EventSchema;
  fnEnvKeys: FnEnvKeys;
  responseSchema: ResponseSchema;
  internal: boolean;
} & Loggable<Logger>;

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
  type AllParams = z.infer<GlobalParamsSchema> & z.infer<StageParamsSchema>;

  return <
    EventSchema extends z.ZodType,
    ResponseSchema extends z.ZodType | undefined,
    Logger extends ConsoleLogger,
    FnEnvKeys extends readonly (keyof AllParams)[],
    EnvKeys extends
      | GlobalEnvKeys[number]
      | StageEnvKeys[number]
      | FnEnvKeys[number],
  >(
    handler: Handler<EventSchema, ResponseSchema, AllParams, EnvKeys, Logger>,
    options: Partial<
      WrapHandlerOptions<
        EventSchema,
        ResponseSchema,
        AllParams,
        FnEnvKeys,
        Logger
      >
    >,
  ) => {
    const {
      contentType = 'application/json',
      enableMultipart = false,
      eventSchema,
      fnEnvKeys = [],
      logger = console as unknown as Logger,
      responseSchema,
      internal = false,
    } = options;

    const stack = buildMiddlewareStack<EventSchema, ResponseSchema, Logger>({
      contentType,
      enableMultipart,
      internal,
      logger,
      eventSchema,
      responseSchema,
    });

    // Lambda-shaped base that injects env + security context
    const base = async (event: APIGatewayProxyEvent, context: Context) => {
      // 1) Keys
      const {
        globalEnvKeys,
        globalParamsSchema,
        stageEnvKeys,
        stageParamsSchema,
      } = cfg;

      const allKeys = deriveAllKeys(globalEnvKeys, stageEnvKeys, fnEnvKeys);

      // 2) Split and build schema
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

      const env = parseTypedEnv(envSchema, process.env) as Pick<
        AllParams,
        GlobalEnvKeys[number] | StageEnvKeys[number] | FnEnvKeys[number]
      >;

      const securityContext = detectSecurityContext(event);

      logger.debug('env', env);

      // 4) Call the business handler
      const result = await handler(event as ShapedEvent<EventSchema>, context, {
        env,
        logger,
        securityContext,
      });

      return result;
    };

    return middy(base).use(stack) as unknown as ProxyV1PromiseHandler;
  };
};
