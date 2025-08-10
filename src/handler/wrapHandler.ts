import middy from '@middy/core';
import httpCors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpMultipartBodyParser from '@middy/http-multipart-body-parser';
import httpResponseSerializer from '@middy/http-response-serializer';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { get } from 'radash';
import type { z } from 'zod';

import { globalExposedEnvKeys } from '@/serverless/stages/global';
import type { GlobalParams } from '@/serverless/stages/globalSchema';
import { globalParamSchema } from '@/serverless/stages/globalSchema';
import type { StageParams } from '@/serverless/stages/stageSchema';
import type { ConsoleLogger, Loggable } from '@/types/Loggable';

import { detectSecurityContext } from './detectSecurityContext';
import type { Handler, HandlerReturn, InferEvent } from './Handler';
import {
  httpZodValidator,
  type HttpZodValidatorOptions,
} from './httpZodValidator';
import { wrapSerializer } from './wrapSerializer';

/**
 * Options for wrapHandler.  envKeys specify additional param keys
 * (beyond those globally exposed) that should be parsed and delivered
 * to the handler as typed environment variables.
 */
export type WrapHandlerOptions<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
> = {
  contentType?: string;
  envKeys?: readonly (keyof GlobalParams | keyof StageParams)[];
} & HttpZodValidatorOptions<EventSchema, ResponseSchema, Logger> &
  Loggable<Logger>;

export const wrapHandler = <
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Env extends GlobalParams & StageParams,
  Logger extends ConsoleLogger,
>(
  handler: Handler<EventSchema, ResponseSchema, Env, Logger>,
  options: WrapHandlerOptions<EventSchema, ResponseSchema, Logger> = {},
) =>
  middy(async (event: APIGatewayProxyEvent, context: Context) => {
    const { logger = console as unknown as Logger, envKeys = [] } = options;

    logger.debug('request', {
      event,
      context,
    });

    // HEAD requests should return immediately without further processing
    if (get(event, 'httpMethod') === 'HEAD') return {};

    // Build and validate the environment for this handler
    const keys = new Set([...globalExposedEnvKeys, ...envKeys]);

    const envSchema = globalParamSchema.pick(
      Object.fromEntries([...keys].map((key) => [key, true])) as Record<
        string,
        true
      >,
    );

    // Parse the environment and cast to the generic Env type
    const env = envSchema.parse(process.env) as Env;
    logger.debug('env', env);

    const securityContext = detectSecurityContext(event);
    const typedEvent = event as unknown as InferEvent<EventSchema>;
    const result = await handler(typedEvent, context, {
      env,
      logger,
      securityContext,
    });

    return result as Awaited<HandlerReturn<ResponseSchema>>;
  })
    .use(httpEventNormalizer())
    .use(httpHeaderNormalizer())
    .use(httpMultipartBodyParser())
    .use(httpJsonBodyParser())
    .use(httpZodValidator<EventSchema, ResponseSchema, Logger>(options))
    .use(
      httpErrorHandler({
        fallbackMessage: 'Non-HTTP server error. See CloudWatch for more info.',
      }),
    )
    .use(
      httpCors({
        credentials: true,
        getOrigin: (o) => o,
      }),
    )
    .use(
      httpResponseSerializer({
        serializers: [
          {
            regex: /^application\/json$/,
            serializer: wrapSerializer(({ body }) => JSON.stringify(body), {
              label: 'application/json',
              logger: options.logger ?? console,
            }),
          },
        ],
        defaultContentType: options.contentType ?? 'application/json',
      }),
    );

