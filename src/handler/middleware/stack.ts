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
): e is { name?: unknown; issues?: unknown; message?: unknown } =>
  typeof e === 'object' && e !== null && 'issues' in e;

type ShapedResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
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

  // Validate request BEFORE any content-type logic so Zod errors surface first
  const mZodValidator = asApiMiddleware(httpZodValidator(options));

  /**
   * Provide a sane default for preferred media types in ALL phases.
   * This prevents 415s when tests only run `.after()` or `.onError()` and when
   * no Accept header is present. Harmless if something else already set it.
   */
  const mPreferredMediaTypes: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    before: (request) => {
      (request as { preferredMediaTypes?: string[] }).preferredMediaTypes ??= [
        defaultContentType,
      ];
      const r = request as { internal?: Record<string, unknown> };
      r.internal ??= {};
      (r.internal as { preferredMediaTypes?: string[] }).preferredMediaTypes ??=
        [defaultContentType];
    },
    after: (request) => {
      (request as { preferredMediaTypes?: string[] }).preferredMediaTypes ??= [
        defaultContentType,
      ];
      const r = request as { internal?: Record<string, unknown> };
      r.internal ??= {};
      (r.internal as { preferredMediaTypes?: string[] }).preferredMediaTypes ??=
        [defaultContentType];
    },
    onError: (request) => {
      (request as { preferredMediaTypes?: string[] }).preferredMediaTypes ??= [
        defaultContentType,
      ];
      const r = request as { internal?: Record<string, unknown> };
      r.internal ??= {};
      (r.internal as { preferredMediaTypes?: string[] }).preferredMediaTypes ??=
        [defaultContentType];
    },
  };

  /**
   * Force your configured content type on shaped responses (esp. error paths).
   * http-error-handler produces a shaped response; we normalize the header so
   * tests expecting vendor +json remain deterministic.
   */
  const mForceContentType: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    after: (request) => {
      const res = (request as { response?: ShapedResponse }).response;
      if (
        res &&
        typeof res === 'object' &&
        'statusCode' in res &&
        'headers' in res &&
        'body' in res
      ) {
        const headers = res.headers ?? {};
        headers['Content-Type'] = defaultContentType;
        res.headers = headers;
      }
    },
    onError: (request) => {
      const res = (request as { response?: ShapedResponse }).response;
      if (
        res &&
        typeof res === 'object' &&
        'statusCode' in res &&
        'headers' in res &&
        'body' in res
      ) {
        const headers = res.headers ?? {};
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
          // Do NOT set a fixed label here; let the matcher decide content-type.
          serializer: ({ body }) =>
            typeof body === 'string' ? body : JSON.stringify(body),
        },
      ],
      defaultContentType,
    }),
  );

  // Combine — AFTER middlewares run in the order listed here for your combine()
  return combine(
    // BEFORE phase
    mHead,
    mEventNormalizer,
    mHeaderNormalizer,
    multipart,
    mJsonBodyParser,
    mZodValidator,

    // AFTER / ERROR phases
    mErrorExpose,
    mErrorHandler,
    mCors,
    mPreferredMediaTypes, // set defaults across all phases
    mForceContentType, // normalize shaped responses to the configured content type
    mResponseSerializer, // last
  );
};
