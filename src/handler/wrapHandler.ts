import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { shake } from 'radash';
import type { z } from 'zod';

import type { AllParams } from '@/serverless/stages';
import { globalEnv, stageEnv } from '@/serverless/stages/env';
import { globalParamsSchema } from '@/serverless/stages/globalSchema';
import { stageParamsSchema } from '@/serverless/stages/stageSchema';
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

type GlobalKey = (typeof globalEnv)[number];
type StageKey = (typeof stageEnv)[number];
type ExposedKey = GlobalKey | StageKey;

export type WrapHandlerOptions<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
  FnKeys extends readonly (keyof AllParams)[],
> = {
  contentType?: string;
  envKeys?: FnKeys;
  eventSchema: EventSchema;
  responseSchema?: ResponseSchema;
} & Loggable<Logger>;

export const wrapHandler = <
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
  const FnKeys extends readonly (keyof AllParams)[],
>(
  handler: Handler<
    EventSchema,
    ResponseSchema,
    ExposedKey | FnKeys[number],
    Logger
  >,
  options: WrapHandlerOptions<EventSchema, ResponseSchema, Logger, FnKeys>,
) =>
  middy(async (event: APIGatewayProxyEvent, context: Context) => {
    if (event.httpMethod === 'HEAD') {
      // Middleware stack will serialize this to API Gateway shape.
      return {};
    }

    const { logger = console as unknown as Logger, envKeys } = options;

    // 1) Exact key set for this function’s env = global + stage + function keys
    const fnEnv = (envKeys ?? []) as readonly (keyof AllParams)[];
    const allKeys = deriveAllKeys(globalEnv, stageEnv, fnEnv);

    // 2) Split into global vs stage using schema key lists
    const { globalPick, stagePick } = splitKeysBySchema(
      allKeys,
      globalParamsSchema,
      stageParamsSchema,
    );

    // 3) Build runtime schema from the two Zod objects
    const envSchema = buildEnvSchema(
      globalPick,
      stagePick,
      globalParamsSchema,
      stageParamsSchema,
    );

    // 4) Parse env and pass strongly-typed object to handler
    const env = parseTypedEnv(envSchema, process.env) as Pick<
      AllParams,
      ExposedKey | FnKeys[number]
    >;

    logger.debug('env', env);

    const securityContext = detectSecurityContext(event);
    const typedEvent = event as unknown as InferEvent<EventSchema>;

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
