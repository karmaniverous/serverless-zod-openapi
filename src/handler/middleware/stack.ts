import type { MiddlewareObj } from '@middy/core';
import httpCors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpMultipartBodyParser from '@middy/http-multipart-body-parser';
import httpResponseSerializer from '@middy/http-response-serializer';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger } from '@/types/Loggable';

import { wrapSerializer } from '../wrapSerializer';
import { asApiMiddleware } from './asApiMiddleware';
import { combine } from './combine';
import {
  httpZodValidator,
  type HttpZodValidatorOptions,
} from './httpZodValidator';
import { noopMiddleware } from './noop';
import { shortCircuitHead } from './shortCircuitHead';

export type BuildStackOptions<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
> = HttpZodValidatorOptions<EventSchema, ResponseSchema, Logger> & {
  /** default: false */
  enableMultipart?: boolean;
  /** default: 'application/json' */
  contentType?: string;
  /** used by the serializer’s logger fallback */
  logger?: ConsoleLogger;
};

/** Build a single composed middleware stack in the correct order. */
export const buildMiddlewareStack = <
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
>(
  options: BuildStackOptions<EventSchema, ResponseSchema, Logger>,
): MiddlewareObj<APIGatewayProxyEvent, Context> => {
  const multipart = options.enableMultipart
    ? asApiMiddleware(httpMultipartBodyParser())
    : noopMiddleware;

  // Re-type third-party middlewares once, then pass typed values to `combine`.
  const mEventNormalizer = asApiMiddleware(httpEventNormalizer());
  const mHeaderNormalizer = asApiMiddleware(httpHeaderNormalizer());
  const mJsonBodyParser = asApiMiddleware(httpJsonBodyParser());
  const mZodValidator = asApiMiddleware(httpZodValidator(options));
  const mErrorHandler = asApiMiddleware(
    httpErrorHandler({
      fallbackMessage: 'Non-HTTP server error. See CloudWatch for more info.',
    }),
  );
  const mCors = asApiMiddleware(
    httpCors({
      credentials: true,
      getOrigin: (o) => o,
    }),
  );
  const mResponseSerializer = asApiMiddleware(
    httpResponseSerializer({
      serializers: [
        {
          regex: /^application\/json$/,
          serializer: wrapSerializer(({ body }) => JSON.stringify(body), {
            label: 'application/json',
            logger: (options.logger ?? console) as Console,
          }),
        },
      ],
      defaultContentType: options.contentType ?? 'application/json',
    }),
  );

  return combine(
    // BEFORE phase
    shortCircuitHead,
    mEventNormalizer,
    mHeaderNormalizer,
    multipart,
    mJsonBodyParser,
    mZodValidator,

    // AFTER / ERROR phases
    mErrorHandler,
    mCors,
    mResponseSerializer,
  );
};
