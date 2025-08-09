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

export interface WrapHandlerOptions {
  contentType?: string;
}

export const wrapHandler = <
  E extends z.ZodType,
  R extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
>(
  handler: Handler<E, R, Logger>,
  opts: WrapHandlerOptions &
    HttpZodValidatorOptions<E, R> &
    Loggable<Logger> = {},
) =>
  middy(async (event: APIGatewayProxyEvent, context: Context) => {
    const { logger = console as unknown as Logger } = opts;

    logger.debug('request context', {
      event,
      context,
      env: { ...process.env },
    });

    if (get(event, 'httpMethod') === 'HEAD') return {};

    const securityContext = detectSecurityContext(event);
    const typedEvent = event as unknown as InferEvent<E>;
    const result = await handler(typedEvent, context, {
      logger,
      securityContext,
    });

    return result as Awaited<HandlerReturn<R>>;
  })
    .use(httpEventNormalizer())
    .use(httpHeaderNormalizer())
    .use(httpMultipartBodyParser())
    .use(httpJsonBodyParser())
    .use(httpZodValidator<E, R, Logger>(opts))
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
              logger: opts.logger ?? console,
            }),
          },
        ],
        defaultContentType: opts.contentType ?? 'application/json',
      }),
    );
