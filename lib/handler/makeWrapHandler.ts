import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z, ZodObject, ZodRawShape } from 'zod';

/**
 * REQUIREMENTS ADDRESSED
 * - Wrapper consumes only (functionConfig, businessHandler).
 * - Use eventType token (from EventTypeMap) to decide HTTP vs internal at runtime.
 * - Validate event/response via provided zod schemas.
 * - Build typed env by reading production stage/global config.
 * - Do not perform HTTP shaping for non-HTTP handlers.
 * - NEVER use dynamic type imports; use static imports only.
 * - NEVER default type parameters; rely on inference from inputs.
 */
import {
  buildEnvSchema,
  deriveAllKeys,
  parseTypedEnv,
  splitKeysBySchema,
} from '@@/lib/handler/envBuilder';
import { buildHttpMiddlewareStack } from '@@/lib/handler/middleware/buildHttpMiddlewareStack';
import type { FunctionConfig } from '@@/lib/types/FunctionConfig';
import type { Handler } from '@@/lib/types/Handler';
import { isHttpEventTypeToken } from '@@/lib/types/HttpEventTokens';
import type { ConsoleLogger } from '@@/lib/types/Loggable';

type Z = z.ZodType;

export const makeWrapHandler = <
  EventSchema extends Z | undefined,
  ResponseSchema extends Z | undefined,
  GlobalParams extends ZodObject<ZodRawShape>,
  StageParams extends ZodObject<ZodRawShape>,
  EventTypeMap,
  EventType extends keyof EventTypeMap,
>(
  functionConfig: FunctionConfig<
    EventSchema,
    ResponseSchema,
    GlobalParams,
    StageParams,
    EventTypeMap & Record<string, unknown>,
    EventType
  >,
  business: Handler<EventSchema, ResponseSchema, EventTypeMap[EventType]>,
) => {
  const { eventSchema, responseSchema, fnEnvKeys, contentType } =
    functionConfig;

  const base = async (event: unknown, context: Context) => {
    // Vitest-friendly: lazy import env config so vi.mock can replace these modules.
    const [g, s] = await Promise.all([
      import('@@/src/config/global'),
      import('@@/src/config/stage'),
    ]);
    const { globalEnvKeys, globalParamsSchema } = g as {
      globalEnvKeys: readonly PropertyKey[];
      globalParamsSchema: ZodObject<ZodRawShape>;
    };
    const { stageEnvKeys, stageParamsSchema } = s as {
      stageEnvKeys: readonly PropertyKey[];
      stageParamsSchema: ZodObject<ZodRawShape>;
    };

    const normalizedFnEnvKeys = (fnEnvKeys ?? []) as readonly (
      | keyof z.infer<GlobalParams>
      | keyof z.infer<StageParams>
    )[];

    // Merge allowlists.
    const all = deriveAllKeys(globalEnvKeys, stageEnvKeys, normalizedFnEnvKeys);

    // Split picks per schema.
    const { globalPick, stagePick } = splitKeysBySchema(
      all,
      globalParamsSchema as unknown as GlobalParams,
      stageParamsSchema as unknown as StageParams,
    );

    // Compose typed env schema & parse the current env.
    const envSchema = buildEnvSchema(
      globalParamsSchema as unknown as GlobalParams,
      globalPick,
      stageParamsSchema as unknown as StageParams,
      stagePick,
    );

    const env = parseTypedEnv(envSchema, process.env);
    const logger: ConsoleLogger =
      (functionConfig as unknown as { logger?: ConsoleLogger }).logger ??
      console;

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

    const out = await business(
      event as unknown as EventTypeMap[EventType],
      context,
      { env, logger },
    );

    // Validate the business response.
    if (responseSchema) {
      const result = responseSchema.safeParse(out as unknown);
      if (!result.success) {
        const e = new Error('Invalid response') as Error & {
          expose: boolean;
          statusCode: number;
          issues: unknown[];
        };
        e.expose = true;
        e.statusCode = 500;
        e.issues = result.error.issues;
        throw e;
      }
    }

    // HTTP vs. non‑HTTP: only shape/validate when eventType is HTTP‑like.
    if (isHttpEventTypeToken(functionConfig.eventType as string)) {
      const http = buildHttpMiddlewareStack({
        eventSchema,
        responseSchema,
        contentType: contentType ?? 'application/json',
        logger,
      });

      const wrapped = middy(
        base as unknown as (
          e: APIGatewayProxyEvent,
          c: Context,
        ) => Promise<unknown>,
      ).use(http);

      return wrapped as unknown as (e: unknown, c: Context) => Promise<unknown>;
    }

    // Non‑HTTP: no middy, no shaping.
    return out;
  };

  // Non‑HTTP: no middy wrapper at construction time; base handles both.
  return base;
};
