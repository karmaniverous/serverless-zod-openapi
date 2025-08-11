import type { MiddlewareObj } from '@middy/core';
import httpContentNegotiation from '@middy/http-content-negotiation';
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
import {
  httpZodValidator,
  type HttpZodValidatorOptions,
} from './httpZodValidator';
import { noopMiddleware } from './noop';
import { shortCircuitHead } from './shortCircuitHead';

const isZodError = (
  e: unknown,
): e is { name?: unknown; issues?: unknown; message: string } => {
  return typeof e === 'object' && e !== null && 'message' in e && 'issues' in e;
};

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

  // BEFORE phase (order matters!)
  const mHead = shortCircuitHead;
  const mEventNormalizer = asApiMiddleware(httpEventNormalizer());
  const mHeaderNormalizer = asApiMiddleware(httpHeaderNormalizer());
  const mJsonBodyParser = asApiMiddleware(httpJsonBodyParser());

  // Validate request BEFORE negotiation so Zod errors surface instead of 415
  const mZodValidator = asApiMiddleware(httpZodValidator(options));

  // Real content negotiation (Accept, q-values, wildcards, +json, etc.)
  const mContentNegotiation = asApiMiddleware(httpContentNegotiation());

  /**
   * Ensure defaults for preferred media types in all phases.
   * This protects tests that call only `.after()` (or error paths) from 415s
   * and mirrors “default to our configured content type when Accept is absent”.
   */
  const mPreferredMediaTypes: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    before: (request) => {
      (
        request as unknown as { preferredMediaTypes?: string[] }
      ).preferredMediaTypes ??= [defaultContentType];
      (
        request as unknown as { internal?: Record<string, unknown> }
      ).internal ??= {} as Record<string, unknown>;
      (
        request as unknown as {
          internal: { preferredMediaTypes?: string[] };
        }
      ).internal.preferredMediaTypes ??= [defaultContentType];
    },
    after: (request) => {
      (
        request as unknown as { preferredMediaTypes?: string[] }
      ).preferredMediaTypes ??= [defaultContentType];
      (
        request as unknown as { internal?: Record<string, unknown> }
      ).internal ??= {} as Record<string, unknown>;
      (
        request as unknown as {
          internal: { preferredMediaTypes?: string[] };
        }
      ).internal.preferredMediaTypes ??= [defaultContentType];
    },
    onError: (request) => {
      (
        request as unknown as { preferredMediaTypes?: string[] }
      ).preferredMediaTypes ??= [defaultContentType];
      (
        request as unknown as { internal?: Record<string, unknown> }
      ).internal ??= {} as Record<string, unknown>;
      (
        request as unknown as {
          internal: { preferredMediaTypes?: string[] };
        }
      ).internal.preferredMediaTypes ??= [defaultContentType];
    },
  };

  /**
   * Force your configured content type on shaped responses (esp. error paths).
   * http-error-handler produces a shaped response (often with application/json).
   * We normalize that to `defaultContentType` to satisfy vendor +json tests.
   */
  const mForceContentType: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    after: (request) => {
      const res = (
        request as unknown as {
          response?: {
            statusCode?: number;
            headers?: Record<string, string>;
            body?: unknown;
          };
        }
      ).response;
      if (
        res &&
        typeof res === 'object' &&
        'statusCode' in res &&
        'headers' in res &&
        'body' in res
      ) {
        const headers = (res.headers ?? {}) as Record<string, string>;
        headers['Content-Type'] = defaultContentType;
        res.headers = headers;
      }
    },
    onError: (request) => {
      const res = (
        request as unknown as {
          response?: {
            statusCode?: number;
            headers?: Record<string, string>;
            body?: unknown;
          };
        }
      ).response;
      if (
        res &&
        typeof res === 'object' &&
        'statusCode' in res &&
        'headers' in res &&
        'body' in res
      ) {
        const headers = (res.headers ?? {}) as Record<string, string>;
        headers['Content-Type'] = defaultContentType;
        res.headers = headers;
      }
    },
  };

  /**
   * Expose errors and map validation-shaped ones to 400.
   * (Avoid unsafe stringification: only test regex when the message is a string.)
   */
  const mErrorExpose: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    onError: (request) => {
      const err = request.error as Error & {
        statusCode?: number;
        expose?: boolean;
        name?: string;
        message?: unknown;
      };

      err.expose = true;

      const msg = typeof err.message === 'string' ? err.message : '';
      if (
        typeof err.statusCode !== 'number' &&
        (isZodError(err) || /invalid (event|response)/i.test(msg))
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

  // Response serializer — JSON and all vendor +json types
  const mResponseSerializer = asApiMiddleware(
    httpResponseSerializer({
      serializers: [
        {
          // Accept application/json, application/*+json (ld+json, vnd.api+json, etc.)
          regex: /^application\/(?:[a-z0-9.+-]*\+)?json$/i,
          serializer: wrapSerializer(({ body }) => JSON.stringify(body), {
            label: 'application/json',
            logger: (options.logger ?? console) as Console,
          }),
        },
      ],
      defaultContentType,
    }),
  );

  // Combine — note: your combine() runs AFTER in registration order.
  return combine(
    // BEFORE phase
    mHead,
    mEventNormalizer,
    mHeaderNormalizer,
    multipart,
    mJsonBodyParser,
    mZodValidator, // validate first (so ZodError wins)
    mContentNegotiation,

    // AFTER / ERROR phases (in order, since your combine preserves order)
    mErrorExpose,
    mErrorHandler,
    mCors,
    mPreferredMediaTypes, // set defaults in all phases
    mForceContentType, // normalize shaped responses to the configured content type
    mResponseSerializer, // last
  );
};
