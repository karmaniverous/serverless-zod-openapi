import middy from '@middy/core';
import httpCors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpMultipartBodyParser from '@middy/http-multipart-body-parser';
import httpResponseSerializer from '@middy/http-response-serializer';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { get } from 'radash';
import type { ZodObject } from 'zod';

import type { ConsoleLogger, Loggable } from '../Loggable';
import type { Handler, Merge } from './Handler';
import {
  httpZodValidator,
  type HttpZodValidatorOptions,
} from './httpZodValidator';
import { wrapSerializer } from './wrapSerializer';

export interface WrapHandlerOptions {
  contentType?: string;
}

export const wrapHandler = <
  EventSchema extends ZodObject,
  ResponseSchema extends ZodObject,
  Logger extends ConsoleLogger,
>(
  handler: Handler<EventSchema, ResponseSchema, Logger>,
  {
    contentType = 'application/json',
    eventSchema,
    responseSchema,
    logger = console as unknown as Logger,
  }: WrapHandlerOptions &
    HttpZodValidatorOptions<EventSchema, ResponseSchema> &
    Loggable<Logger> = {},
) =>
  middy()
    .use(httpEventNormalizer())
    .use(httpHeaderNormalizer())
    .use(httpMultipartBodyParser(/* { disableContentTypeError: true } */))
    .use(httpJsonBodyParser(/* { disableContentTypeError: true } */))
    .use(httpZodValidator({ eventSchema, responseSchema, logger }))
    .use(
      httpErrorHandler({
        fallbackMessage: 'Non-HTTP server error. See CloudWatch for more info.',
      }),
    )
    .use(
      httpCors({
        // Sets Access-Control-Allow-Credentials
        credentials: true,
        // Sets Access-Control-Allow-Origin to current origin.
        getOrigin: (incomingOrigin) => incomingOrigin,
      }),
    )
    .use(
      httpResponseSerializer({
        serializers: [
          {
            regex: /^application\/json$/,
            serializer: wrapSerializer(({ body }) => JSON.stringify(body), {
              label: 'application/json',
              logger,
            }),
          },
        ],
        defaultContentType: contentType,
      }),
    )
    .handler(async (event, context) => {
      logger.debug('request context', {
        event,
        context,
        env: { ...process.env },
      });

      if (get(event, 'httpMethod') === 'HEAD') return {};

      return await handler(
        event as unknown as Merge<APIGatewayProxyEvent, EventSchema>,
        context,
        { logger },
      );
    });
