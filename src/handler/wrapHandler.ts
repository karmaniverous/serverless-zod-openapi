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

import type { ConsoleLogger, Loggable } from '@/types/Loggable';

import { detectSecurityContext } from './detectSecurityContext';
import type { Handler, HandlerReturn, InferEvent } from './Handler';
import {
  httpZodValidator,
  type HttpZodValidatorOptions,
} from './httpZodValidator';
import { wrapSerializer } from './wrapSerializer';

export type WrapHandlerOptions<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
> = {
  contentType?: string;
} & HttpZodValidatorOptions<EventSchema, ResponseSchema, Logger> &
  Loggable<Logger>;

export const wrapHandler = <
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
>(
  handler: Handler<EventSchema, ResponseSchema, Logger>,
  options: WrapHandlerOptions<EventSchema, ResponseSchema, Logger> = {},
) =>
  middy(async (event: APIGatewayProxyEvent, context: Context) => {
    const { logger = console as unknown as Logger } = options;

    logger.debug('request context', {
      event,
      context,
      env: { ...process.env },
    });

    if (get(event, 'httpMethod') === 'HEAD') return {};

    const securityContext = detectSecurityContext(event);
    const typedEvent = event as unknown as InferEvent<EventSchema>;
    const result = await handler(typedEvent, context, {
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
