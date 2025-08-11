import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { shake } from 'radash';
import type { z, ZodObject, ZodRawShape } from 'zod';

import type { ConsoleLogger, Loggable } from '@/types/Loggable';

import { detectSecurityContext } from './detectSecurityContext';
import {
  buildEnvSchema,
  deriveAllKeys,
  parseTypedEnv,
  splitKeysBySchema,
} from './envBuilder';
import type { Handler, HandlerReturn, InferEvent } from './Handler';
import type { BuildStackOptions } from './middleware/stack';
import { buildMiddlewareStack } from './middleware/stack';

/** Generic options (no prod types). */
export type WrapHandlerOptions<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  AP extends Record<string, unknown>,
  Logger extends ConsoleLogger,
  const FnKeys extends readonly (keyof AP)[],
> = {
  contentType?: string;
  envKeys?: FnKeys;
  eventSchema: EventSchema;
  responseSchema?: ResponseSchema;
} & Loggable<Logger>;

/** Config that defines schemas and exposed env keys (prod or test). */
export type StagesRuntime<
  G extends ZodObject<ZodRawShape>,
  S extends ZodObject<ZodRawShape>,
  const GKeys extends readonly (keyof z.infer<G>)[],
  const SKeys extends readonly (keyof z.infer<S>)[],
> = {
  globalParamsSchema: G;
  stageParamsSchema: S;
  globalEnv: GKeys;
  stageEnv: SKeys;
};

/** Factory that binds a stages runtime and returns a fully-typed wrapHandler. */
export const makeWrapHandler = <
  G extends ZodObject<ZodRawShape>,
  S extends ZodObject<ZodRawShape>,
  const GKeys extends readonly (keyof z.infer<G>)[],
  const SKeys extends readonly (keyof z.infer<S>)[],
>(
  cfg: StagesRuntime<G, S, GKeys, SKeys>,
) => {
  type AP = z.infer<G> & z.infer<S>;
  type ExposedKey = GKeys[number] | SKeys[number];

  return <
    EventSchema extends z.ZodType,
    ResponseSchema extends z.ZodType | undefined,
    Logger extends ConsoleLogger,
    const FnKeys extends readonly (keyof AP)[],
  >(
    handler: Handler<
      EventSchema,
      ResponseSchema,
      AP,
      ExposedKey | FnKeys[number],
      Logger
    >,
    options: WrapHandlerOptions<
      EventSchema,
      ResponseSchema,
      AP,
      Logger,
      FnKeys
    >,
  ) =>
    middy(async (event: APIGatewayProxyEvent, context: Context) => {
      if (event.httpMethod === 'HEAD') {
        // Middleware stack will serialize this to API Gateway shape.
        return {};
      }

      const { logger = console as unknown as Logger, envKeys } = options;

      // 1) Exact key set for this function’s env = global + stage + function keys
      const fnEnv = (envKeys ?? []) as readonly (keyof AP)[];
      const allKeys = deriveAllKeys(cfg.globalEnv, cfg.stageEnv, fnEnv);

      // 2) Split into global vs stage using schema key lists
      const { globalPick, stagePick } = splitKeysBySchema(
        allKeys,
        cfg.globalParamsSchema,
        cfg.stageParamsSchema,
      );

      // 3) Build runtime schema from the two Zod objects
      const envSchema = buildEnvSchema(
        globalPick,
        stagePick,
        cfg.globalParamsSchema,
        cfg.stageParamsSchema,
      );

      // 4) Parse env and pass strongly-typed object to handler
      const typedEvent = options.eventSchema
        ? (options.eventSchema.parse(event) as InferEvent<EventSchema>)
        : (event as unknown as InferEvent<EventSchema>);

      const securityContext = detectSecurityContext(typedEvent);

      const env = parseTypedEnv(envSchema, process.env) as Pick<
        AP,
        ExposedKey | FnKeys[number]
      >;

      const result = await handler(typedEvent, context, {
        env,
        logger,
        securityContext,
      });

      return result as Awaited<HandlerReturn<ResponseSchema>>;
    }).use(
      buildMiddlewareStack<EventSchema, ResponseSchema, Logger>(
        // With exactOptionalPropertyTypes, omit undefineds via radash.shake
        shake({
          eventSchema: options.eventSchema,
          responseSchema: options.responseSchema,
          contentType: options.contentType ?? 'application/json',
          logger: options.logger,
        }) as BuildStackOptions<EventSchema, ResponseSchema, Logger>,
      ),
    );
};

/** ---- PROD-BOUND VERSION (keeps existing imports working) ---- */
import { globalEnv, stageEnv } from '@/serverless/stages/env';
import { globalParamsSchema } from '@/serverless/stages/globalSchema';
import { stageParamsSchema } from '@/serverless/stages/stageSchema';

export const wrapHandler = makeWrapHandler({
  globalParamsSchema,
  stageParamsSchema,
  globalEnv,
  stageEnv,
});
