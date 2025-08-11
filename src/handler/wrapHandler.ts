import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z, ZodObject, ZodRawShape } from 'zod';

import type { ConsoleLogger, Loggable } from '@/types/Loggable';

import { detectSecurityContext } from './detectSecurityContext';
import {
  buildEnvSchema,
  deriveAllKeys,
  parseTypedEnv,
  splitKeysBySchema,
} from './envBuilder';
import type { HandlerOptions, HandlerReturn, InferEvent } from './Handler';
import { buildMiddlewareStack } from './middleware/stack';

/** Generic options (no prod types). */
export type WrapHandlerOptions<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  AP extends Record<string, unknown>,
  Logger extends ConsoleLogger,
  FnKeys extends readonly (keyof AP)[],
> = {
  contentType?: string;
  envKeys?: FnKeys;
  eventSchema: EventSchema; // always required
  responseSchema?: ResponseSchema;
} & Loggable<Logger>;

export type StagesRuntime<
  G extends ZodObject<ZodRawShape>,
  S extends ZodObject<ZodRawShape>,
  GKeys extends readonly (keyof z.infer<G>)[],
  SKeys extends readonly (keyof z.infer<S>)[],
> = {
  globalParamsSchema: G;
  stageParamsSchema: S;
  globalEnv: GKeys;
  stageEnv: SKeys;
};

// Keep 'const' on the function; that’s allowed.
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
    FnKeys extends readonly (keyof AP)[],
  >(
    handler: (
      event: InferEvent<EventSchema>,
      context: Context,
      options: HandlerOptions<AP, ExposedKey | FnKeys[number], Logger>,
    ) => HandlerReturn<ResponseSchema>,
    options: WrapHandlerOptions<
      EventSchema,
      ResponseSchema,
      AP,
      Logger,
      FnKeys
    >,
  ) => {
    const stack = buildMiddlewareStack<EventSchema, ResponseSchema, Logger>({
      contentType: options.contentType,
      responseSchema: options.responseSchema,
      eventSchema: options.eventSchema,
      logger: (options.logger || console) as Logger,
    });

    const wrapped = middy(handler).use(stack);

    return async (event: APIGatewayProxyEvent, context: Context) => {
      // 1) Combine keys
      const fnEnv = (options.envKeys ?? []) as readonly (keyof AP)[];
      const allKeys = deriveAllKeys(cfg.globalEnv, cfg.stageEnv, fnEnv);

      // 2) Split by schema
      const { globalPick, stagePick } = splitKeysBySchema(
        allKeys,
        cfg.globalParamsSchema,
        cfg.stageParamsSchema,
      );

      // 3) Build parsing schema
      const envSchema = buildEnvSchema(
        globalPick,
        stagePick,
        cfg.globalParamsSchema,
        cfg.stageParamsSchema,
      );

      // 4) Parse event & env, then call handler
      const typedEvent = options.eventSchema.parse(
        event,
      ) as InferEvent<EventSchema>;
      const securityContext = detectSecurityContext(
        typedEvent as APIGatewayProxyEvent,
      );

      const env = parseTypedEnv(envSchema, process.env) as Pick<
        AP,
        ExposedKey | FnKeys[number]
      >;

      const result = await handler(typedEvent, context, {
        env,
        logger: (options.logger || console) as Logger,
        securityContext,
      });

      return result as Awaited<HandlerReturn<ResponseSchema>>;
    };
  };
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
