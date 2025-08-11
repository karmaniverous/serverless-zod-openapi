import type { MiddlewareObj } from '@middy/core';
import httpCors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
// NOTE: multipart intentionally disabled for now to avoid dynamic import in AWS VM.
// import httpMultipartBodyParser from '@middy/http-multipart-body-parser';
import httpResponseSerializer from '@middy/http-response-serializer';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger } from '@/types/Loggable';

import { wrapSerializer } from '../wrapSerializer';
import { asApiMiddleware } from './asApiMiddleware';
import { combine } from './combine';
import { contentNegotiationShim } from './contentNegotiationShim';
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
  /** default: false — kept off until we resolve the Lambda dynamic import issue */
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
  const defaultContentType = options.contentType ?? 'application/json';

  // Optional (currently disabled) multipart parsing.
  // const multipart = options.enableMultipart
  //   ? asApiMiddleware(httpMultipartBodyParser())
  //   : noopMiddleware;
  const multipart = noopMiddleware;

  // Re-type third-party middlewares once, then pass typed values to `combine`.
  const mHead = shortCircuitHead;
  const mEventNormalizer = asApiMiddleware(httpEventNormalizer());
  const mHeaderNormalizer = asApiMiddleware(httpHeaderNormalizer());
  const mJsonBodyParser = asApiMiddleware(httpJsonBodyParser());

  // Validate both request and raw response objects with Zod.
  const mZodValidator = asApiMiddleware(httpZodValidator(options));

  /**
   * Ensure response-serializer has a preferred media type list when the
   * content-negotiation middleware isn't present.
   */
  const mPreferredMediaTypes = asApiMiddleware(
    contentNegotiationShim(defaultContentType),
  );

  /**
   * Set `expose=true` for normal Errors and coerce Zod-like issues to 400
   * so http-error-handler returns meaningful messages in dev/local.
   */
  const mErrorExpose: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    onError: (request) => {
      const err = request.error as Error & {
        statusCode?: number;
        expose?: boolean;
        name?: string;
      };

      // Mark plain Errors as exposable (so message is returned)
      err && (err.expose = true);

      // If the validator threw BadRequest, leave status at 400; otherwise,
      // try to recognize common validation-shaped errors and map to 400.
      if (
        typeof err.statusCode !== 'number' &&
        /invalid (event|response)/i.test(err.message)
      ) {
        err.statusCode = 400;
      }
    },
  };

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

  // Response serializer — logs pre/post serialize and enforces content-type.
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
      defaultContentType,
    }),
  );

  return combine(
    // BEFORE phase
    mHead,
    mEventNormalizer,
    mHeaderNormalizer,
    multipart,
    mJsonBodyParser,
    mZodValidator,

    // AFTER / ERROR phases
    mErrorExpose, // mark messages exposable + coerce to 400 when appropriate
    mErrorHandler,
    mCors,
    mPreferredMediaTypes, // must run before serializer
    mResponseSerializer,
  );
};
