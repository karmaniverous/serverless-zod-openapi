import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z, ZodObject, ZodRawShape } from 'zod';

import { detectSecurityContext } from '@/src/handler/detectSecurityContext';
import {
  buildEnvSchema,
  deriveAllKeys,
  parseTypedEnv,
  splitKeysBySchema,
} from '@/src/handler/envBuilder';
import type {
  HandlerOptions,
  HandlerReturn,
  InferEvent,
} from '@/src/handler/Handler';
import { buildMiddlewareStack } from '@/src/handler/middleware/buildStack';
import type { ConsoleLogger, Loggable } from '@/src/types/Loggable';

/** Generic options (no prod types). */
export type WrapHandlerOptions<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  AllParams extends Record<string, unknown>,
  Logger extends ConsoleLogger,
  FnEnvKeys extends readonly (keyof AllParams)[],
> = {
  contentType: string;
  eventSchema: EventSchema;
  fnEnvKeys: FnEnvKeys;
  responseSchema: ResponseSchema;
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

// Keep 'const' on the function; that’s allowed.
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
  type ExposedKey = GlobalEnvKeys[number] | StageEnvKeys[number];

  return <
    EventSchema extends z.ZodType,
    ResponseSchema extends z.ZodType | undefined,
    Logger extends ConsoleLogger,
    FnKeys extends readonly (keyof AllParams)[],
  >(
    handler: (
      event: InferEvent<EventSchema>,
      context: Context,
      options: HandlerOptions<AllParams, ExposedKey | FnKeys[number], Logger>,
    ) => HandlerReturn<ResponseSchema>,
    options: Partial<
      WrapHandlerOptions<EventSchema, ResponseSchema, AllParams, Logger, FnKeys>
    >,
  ) => {
    const {
      contentType = 'application/json',
      eventSchema,
      fnEnvKeys = [],
      logger = console as unknown as Logger,
      responseSchema,
    } = options;

    const stack = buildMiddlewareStack<EventSchema, ResponseSchema, Logger>({
      contentType,
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

      // 3) Parse event + env and call business handler
      const typedEvent = options.eventSchema.parse(
        event,
      ) as InferEvent<EventSchema>;

      const env = parseTypedEnv(envSchema, process.env) as Pick<
        AllParams,
        ExposedKey | FnKeys[number]
      >;

      const securityContext = detectSecurityContext(typedEvent);

      logger.debug('env', env);

      // HEAD short-circuit (defense-in-depth): if the request method is HEAD,
      // skip the business handler entirely and let AFTER middlewares shape "{}".
      // {
      //   const evt = event as unknown as {
      //     httpMethod?: string;
      //     requestContext?: { http?: { method?: string } };
      //   };
      //   const method = (
      //     evt.httpMethod ??
      //     evt.requestContext?.http?.method ??
      //     ''
      //   ).toUpperCase();
      //   if (method === 'HEAD') {
      //     return { statusCode: 200, headers: {}, body: {} } as {
      //       statusCode: number;
      //       headers?: Record<string, string>;
      //       body?: unknown;
      //     };
      //   }
      // }

      // 4) Call the business handler
      const result = await handler(typedEvent, context, {
        env,
        logger,
        securityContext,
      });

      return result;
    };

    const wrapped = middy(base).use(stack);
    return (evt: APIGatewayProxyEvent, ctx: Context) => wrapped(evt, ctx);
  };
};

