import type { MiddlewareObj } from '@middy/core';
import httpContentNegotiation from '@middy/http-content-negotiation';
import httpCors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpResponseSerializer from '@middy/http-response-serializer';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger, Loggable } from '@@/lib/types/Loggable';

import { asApiMiddleware } from './asApiMiddleware';
import { combine } from './combine';
import {
  httpZodValidator,
  type HttpZodValidatorOptions,
} from './httpZodValidator';
import { shortCircuitHead } from './shortCircuitHead';

const isZodError = (
  e: unknown,
): e is { errors?: unknown[]; issues?: unknown[] } => {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return Array.isArray(obj.errors) || Array.isArray(obj.issues);
};

export type BuildStackOptions<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
> = HttpZodValidatorOptions<EventSchema, ResponseSchema, Logger> & {
  /** when true, skip HTTP-specific middlewares (CORS, serializers, parsers, etc.) */
  internal?: boolean;
  /** default: 'application/json' */
  contentType?: string;
} & Partial<Loggable<Logger>>;

/** Build a single composed middleware stack in the correct order. */
export const buildMiddlewareStack = <
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
>(
  options: BuildStackOptions<EventSchema, ResponseSchema, Logger>,
): MiddlewareObj<APIGatewayProxyEvent, Context> => {
  const {
    contentType = 'application/json',
    eventSchema,
    responseSchema,
    logger = console as unknown as Logger,
  } = options;

  // BEFORE phase (order matters!)
  const mHead: MiddlewareObj<APIGatewayProxyEvent, Context> = shortCircuitHead;
  const mEventNormalizer = asApiMiddleware(httpEventNormalizer());
  const mHeaderNormalizer = asApiMiddleware(httpHeaderNormalizer());
  const mContentNegotiation = asApiMiddleware(
    httpContentNegotiation({
      parseLanguages: false,
      parseCharsets: false,
      parseEncodings: false,
      availableMediaTypes: [contentType],
    }),
  );
  const mJsonBodyParser = asApiMiddleware(
    // No multipart detection; always enable JSON parsing but do NOT 415 on content-type
    httpJsonBodyParser({ disableContentTypeError: true }),
  );
  const mZodValidator: MiddlewareObj<APIGatewayProxyEvent, Context> =
    httpZodValidator<EventSchema, ResponseSchema, Logger>({
      eventSchema,
      responseSchema,
      logger,
    }) as unknown as MiddlewareObj<APIGatewayProxyEvent, Context>;

  // AFTER / ERROR phases
  const mPreferredMediaTypes: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    before: (request) => {
      (request as { preferredMediaTypes?: string[] }).preferredMediaTypes ??= [
        contentType,
      ];
      const r = request as { internal?: Record<string, unknown> };
      r.internal ??= {};
      (r.internal as { preferredMediaTypes?: string[] }).preferredMediaTypes ??=
        [contentType];
    },
    after: (request) => {
      (request as { preferredMediaTypes?: string[] }).preferredMediaTypes ??= [
        contentType,
      ];
      const r = request as { internal?: Record<string, unknown> };
      r.internal ??= {};
      (r.internal as { preferredMediaTypes?: string[] }).preferredMediaTypes ??=
        [contentType];
    },
    onError: (request) => {
      (request as { preferredMediaTypes?: string[] }).preferredMediaTypes ??= [
        contentType,
      ];
      const r = request as { internal?: Record<string, unknown> };
      r.internal ??= {};
      (r.internal as { preferredMediaTypes?: string[] }).preferredMediaTypes ??=
        [contentType];
    },
  };

  const mErrorExpose: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    onError: (request) => {
      const maybeErr = (request as { error?: unknown }).error;
      if (!(maybeErr instanceof Error)) return;

      const err = maybeErr as Error & {
        statusCode?: number;
        expose?: boolean;
        message?: unknown;
      };

      err.expose = true;
      const msg = typeof err.message === 'string' ? err.message : '';

      // If it smells like a validation error and no status is set, make it 400.
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
      defaultContentType: contentType,
    }),
  );

  const mShapeAndContentType: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    after: (request) => {
      const container = request as unknown as { response?: unknown };
      const current = container.response;
      if (!current || typeof current !== 'object') return;

      const looksShaped =
        'statusCode' in (current as Record<string, unknown>) &&
        'headers' in (current as Record<string, unknown>) &&
        'body' in (current as Record<string, unknown>);

      const res: {
        statusCode: number;
        headers?: Record<string, string>;
        body?: unknown;
      } = looksShaped
        ? (current as {
            statusCode: number;
            headers?: Record<string, string>;
            body?: unknown;
          })
        : { statusCode: 200, headers: {}, body: current };

      // Ensure body is a string so the serializer won't 415
      if (res.body !== undefined && typeof res.body !== 'string') {
        try {
          res.body = JSON.stringify(res.body);
        } catch {
          res.body = String(res.body);
        }
      }

      const headers = res.headers ?? {};
      headers['Content-Type'] = contentType;
      res.headers = headers;

      (request as unknown as { response: typeof res }).response = res;
    },
  };

  // Compose in the precise order listed here
  return combine(
    // BEFORE phase
    mHead,
    mEventNormalizer,
    mHeaderNormalizer,
    mContentNegotiation,
    mJsonBodyParser,
    mZodValidator,

    // AFTER / ERROR phases
    mErrorExpose,
    mErrorHandler,
    mCors,
    mPreferredMediaTypes,
    mShapeAndContentType,
    mResponseSerializer,
  );
};
