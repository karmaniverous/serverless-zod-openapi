/**
 * REQUIREMENTS ADDRESSED
 * - Always: apply event/response Zod validation (throw on failure).
 * - HTTP only: apply the middy HTTP stack (no conditionality inside).
 * - Thread GlobalParams & StageParams for env key typing.
 * - Use TypedHandler<EventSchema, ResponseSchema, EventType> for correct event typing.
 * - Default missing fnEnvKeys to [] at consumption time (authoring stays optional).
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
import type { TypedHandler } from '@@/lib/handler/Handler';
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
  // Use explicit message cues so the HTTP stack can map to 400.
  const err = Object.assign(
    new Error(kind === 'event' ? 'Invalid event' : 'Invalid response'),
    {
      name: 'ZodError',
      issues: result.error.issues,
    },
  );
  // Express intent to expose/mask at HTTP layer.
  (err as { expose?: boolean; statusCode?: number }).expose = true;
  (err as { statusCode?: number }).statusCode = 400;
  throw err;
};

const isHttpConfig = <E>(
  cfg: Partial<FunctionConfig<Z | undefined, Z | undefined, Z, Z, E>>,
): cfg is FunctionConfig<Z | undefined, Z | undefined, Z, Z, HttpEvent> => {
  // At authoring time, HTTP-only keys are gated by EventType.
  // At runtime, presence of one of these keys indicates HTTP intent.
  return Boolean(
    (cfg as { method?: unknown }).method ||
      (cfg as { httpContexts?: unknown }).httpContexts ||
      (cfg as { basePath?: unknown }).basePath ||
      (cfg as { contentType?: unknown }).contentType,
  );
};

export const makeWrapHandler = <
  GlobalParams extends ZodObject<ZodRawShape>,
  const GlobalEnvKeys extends readonly (keyof z.infer<GlobalParams>)[],
  StageParams extends ZodObject<ZodRawShape>,
  const StageEnvKeys extends readonly (keyof z.infer<StageParams>)[],
>(
  stages: StagesRuntime<GlobalParams, StageParams>,
) => {
  return <
    EventSchema extends Z | undefined,
    ResponseSchema extends Z | undefined,
    Logger extends ConsoleLogger,
    EventType,
  >(
    handler: TypedHandler<EventSchema, ResponseSchema, EventType>,
    functionConfig: Partial<
      FunctionConfig<
        EventSchema,
        ResponseSchema,
        GlobalParams,
        StageParams,
        EventType
      >
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

      // Validate incoming *event* first (after any HTTP body parsing if HTTP stack is present).
      assertWithZod(event, eventSchema, logger, 'event');

      // Detect HTTP security context only for actual HTTP events.
      const httpLike = (isV1(event) || isV2(event)) as boolean;
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
        // We deliberately rely on the handler's own typing (EventParam<EventType, EventSchema>).
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
        // We deliberately disable Zod in the stack (the base throws).
        eventSchema: undefined,
        responseSchema: undefined,
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
        // We assume the author selected an HTTP EventType at compile time.
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
