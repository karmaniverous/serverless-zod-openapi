/**
 * REQUIREMENTS ADDRESSED
 * - Always validate event/response (throw on failure).
 * - Apply HTTP middy stack ONLY when the authored EventType is HTTP.
 * - Thread GlobalParams & StageParams for precise env key typing.
 * - Default missing fnEnvKeys to [] at consumption time; authoring stays optional.
 * - Honor renamed middleware: buildHttpMiddlewareStack.
 */

import middy from '@middy/core';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  Context,
} from 'aws-lambda';
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
import type { Handler } from '@@/lib/handler/Handler';
import { buildHttpMiddlewareStack } from '@@/lib/handler/middleware/buildHttpMiddlewareStack';
import { pojofy } from '@@/lib/pojofy';
import type { FunctionConfig, HttpEvent } from '@@/lib/types/FunctionConfig';
import type { ConsoleLogger, Loggable } from '@@/lib/types/Loggable';

type Z = z.ZodType;

export type StagesRuntime<
  GlobalParams extends ZodObject<ZodRawShape>,
  StageParams extends ZodObject<ZodRawShape>,
> = {
  globalEnvKeys: readonly (keyof z.infer<GlobalParams>)[];
  globalParamsSchema: GlobalParams;
  stageEnvKeys: readonly (keyof z.infer<StageParams>)[];
  stageParamsSchema: StageParams;
};

const assertWithZod = (
  value: unknown,
  schema: Z | undefined,
  logger: ConsoleLogger,
  kind: 'event' | 'response',
): void => {
  if (!schema) return;
  logger.debug('validating with zod', pojofy(value));
  const result = schema.safeParse(value);
  if (result.success) {
    logger.debug('zod validation succeeded', pojofy(result));
    return;
  }
  const err = Object.assign(
    new Error(kind === 'event' ? 'Invalid event' : 'Invalid response'),
    {
      name: 'ZodError',
      issues: result.error.issues,
      expose: true,
      statusCode: 400,
    },
  );
  throw err;
};

const isHttpConfig = <E>(
  cfg: FunctionConfig<Z | undefined, Z | undefined, Z, Z, E>,
): cfg is FunctionConfig<Z | undefined, Z | undefined, Z, Z, HttpEvent> => {
  // Type-gated in authoring; this is a runtime convenience.
  return !!(
    (cfg as { method?: unknown }).method ||
    (cfg as { httpContexts?: unknown }).httpContexts ||
    (cfg as { basePath?: unknown }).basePath
  );
};

export const makeWrapHandler = <
  GlobalParams extends ZodObject<ZodRawShape>,
  StageParams extends ZodObject<ZodRawShape>,
>(
  stages: StagesRuntime<GlobalParams, StageParams>,
) => {
  return <
    EventSchema extends Z | undefined,
    ResponseSchema extends Z | undefined,
    Logger extends ConsoleLogger,
    EventType,
  >(
    handler: Handler<EventSchema, ResponseSchema, EventType>,
    functionConfig: FunctionConfig<
      EventSchema,
      ResponseSchema,
      GlobalParams,
      StageParams,
      EventType
    > &
      Partial<Loggable<Logger>>,
  ): ((event: EventType, context: Context) => Promise<unknown>) => {
    const {
      eventSchema,
      responseSchema,
      fnEnvKeys,
      contentType = 'application/json',
      logger = console as unknown as Logger,
    } = functionConfig;

    //
    // Base wrapper: env + validate event/response (throw on failure)
    //
    const base = async (event: EventType, context: Context) => {
      const {
        globalEnvKeys,
        globalParamsSchema,
        stageEnvKeys,
        stageParamsSchema,
      } = stages;

      const normalizedFnEnvKeys = (fnEnvKeys ?? []) as readonly (
        | keyof z.infer<GlobalParams>
        | keyof z.infer<StageParams>
      )[];

      const allKeys = deriveAllKeys(
        globalEnvKeys,
        stageEnvKeys,
        normalizedFnEnvKeys,
      );

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

      // Validate incoming *event* first (after HTTP parsing if applicable).
      assertWithZod(event, eventSchema, logger, 'event');

      // Detect HTTP security context only for actual HTTP events.
      const httpLike = (isV1(event) || isV2(event));
      const extras = httpLike
        ? {
            env,
            logger,
            securityContext: detectSecurityContext(
              event as unknown as APIGatewayProxyEvent,
            ),
          }
        : { env, logger };

      const result = await handler(
        event as unknown as Parameters<typeof handler>[0],
        context,
        extras,
      );

      // Validate outgoing *response* next.
      assertWithZod(result, responseSchema, logger, 'response');

      // Internal path returns raw; HTTP shaping happens in the HTTP stack.
      return result;
    };

    //
    // HTTP: wrap the base under the HTTP stack
    //
    if (isHttpConfig<EventType>(functionConfig)) {
      const httpStack = buildHttpMiddlewareStack<undefined, undefined, Logger>({
        // We skip Zod in the stack (base throws). Don’t pass explicit `undefined`.
        internal: false,
        logger,
        contentType,
      });

      const httpWrapped = middy(
        base as unknown as (
          e: APIGatewayProxyEvent | APIGatewayProxyEventV2,
          c: Context,
        ) => Promise<unknown>,
      ).use(httpStack);

      return async (event: EventType, context: Context) => {
        return httpWrapped(
          event as unknown as APIGatewayProxyEvent | APIGatewayProxyEventV2,
          context,
        );
      };
    }

    //
    // Non-HTTP: just use base (no middy)
    //
    return async (event: EventType, context: Context) => base(event, context);
  };
};
