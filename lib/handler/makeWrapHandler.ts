/**
 * REQUIREMENTS ADDRESSED
 * - Always validate event/response (throw on failure).
 * - Apply HTTP middy stack ONLY when the authored EventType is HTTP.
 * - Thread GlobalParams & StageParams everywhere so fnEnvKeys type narrows correctly.
 * - Default missing fnEnvKeys to [] when consumed.
 * - Use renamed middleware: buildHttpMiddlewareStack.
 * - Do not perform HTTP shaping for internal (non-HTTP) handlers.
 */
import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z, ZodObject, ZodRawShape } from 'zod';

import {
  buildEnvSchema,
  deriveAllKeys,
  parseTypedEnv,
  splitKeysBySchema,
} from '@@/lib/handler/envBuilder';
import { buildHttpMiddlewareStack } from '@@/lib/handler/middleware/buildHttpMiddlewareStack';
import type { FunctionConfig } from '@@/lib/types/FunctionConfig';
import type { Handler } from '@@/lib/types/Handler';
import type { ConsoleLogger } from '@@/lib/types/Loggable';

type Z = z.ZodType;

/** Stages runtime needed by the wrapper. */
export type StagesRuntime<
  GlobalParams extends ZodObject<ZodRawShape>,
  StageParams extends ZodObject<ZodRawShape>,
> = {
  globalEnvKeys: readonly (keyof z.infer<GlobalParams>)[];
  globalParamsSchema: GlobalParams;
  stageEnvKeys: readonly (keyof z.infer<StageParams>)[];
  stageParamsSchema: StageParams;
};

const isHttpConfig = <
  E,
  G extends ZodObject<ZodRawShape>,
  S extends ZodObject<ZodRawShape>,
>(
  cfg: FunctionConfig<Z | undefined, Z | undefined, G, S, E>,
): boolean => {
  return Boolean(
    (cfg as { method?: unknown }).method ||
      (cfg as { httpContexts?: unknown }).httpContexts ||
      (cfg as { basePath?: unknown }).basePath,
  );
};

export const makeWrapHandler =
  <
    GlobalParams extends ZodObject<ZodRawShape>,
    StageParams extends ZodObject<ZodRawShape>,
  >(
    stages: StagesRuntime<GlobalParams, StageParams>,
  ) =>
  <
    EventSchema extends Z | undefined,
    ResponseSchema extends Z | undefined,
    EventType,
  >(
    business: Handler<EventSchema, ResponseSchema, EventType>,
    functionConfig: FunctionConfig<
      EventSchema,
      ResponseSchema,
      GlobalParams,
      StageParams,
      EventType
    >,
  ) => {
    const { eventSchema, responseSchema, fnEnvKeys, contentType } =
      functionConfig;

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
        globalParamsSchema,
        stageParamsSchema,
        globalPick,
        stagePick,
      );

      const env = parseTypedEnv(envSchema, process.env);
      const logger: ConsoleLogger =
        (
          functionConfig as unknown as {
            logger?: ConsoleLogger;
          }
        ).logger ?? console;

      // Validate the incoming event; thrown Zod errors will be mapped by HTTP middleware.
      if (eventSchema) {
        const result = eventSchema.safeParse(event as unknown);
        if (!result.success) {
          const e = new Error('Invalid input') as Error & {
            expose: boolean;
            statusCode: number;
            issues: unknown[];
          };
          e.expose = true;
          e.statusCode = 400;
          e.issues = result.error.issues;
          throw e;
        }
      }

      const out = await business(event as any, context, { env, logger });

      // Validate the business response.
      if (responseSchema) {
        const result = responseSchema.safeParse(out as unknown);
        if (!result.success) {
          const e = new Error('Invalid response') as Error & {
            expose?: boolean;
            statusCode?: number;
            issues?: unknown[];
          };
          // Mark as exposed only for HTTP; internal callers should see a throw.
          if (isHttpConfig(functionConfig)) {
            e.expose = true;
            e.statusCode = 500;
          }
          e.issues = result.error.issues;
          throw e;
        }
      }

      return out;
    };

    if (isHttpConfig(functionConfig)) {
      const http = buildHttpMiddlewareStack({
        internal: false,
        eventSchema: eventSchema as EventSchema,
        responseSchema: responseSchema as ResponseSchema,
        contentType: contentType ?? 'application/json',
        logger:
          (functionConfig as unknown as { logger?: ConsoleLogger }).logger ??
          console,
      });

      const wrapped = middy(
        base as unknown as (
          e: APIGatewayProxyEvent,
          c: Context,
        ) => Promise<unknown>,
      ).use(http);

      return wrapped as unknown as (
        e: EventType,
        c: Context,
      ) => Promise<unknown>;
    }

    // Non‑HTTP: no middy, no shaping.
    return base;
  };
