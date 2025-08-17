/* REQUIREMENTS ADDRESSED
- Provide a single composed Middy middleware stack for API Gateway (HTTP) and "internal" invocations.
- Always normalize handler results to an HTTP-shaped response and set `Content-Type` to the configured value.
- Validate incoming events and outgoing responses against optional Zod schemas.
- HEAD requests must short‑circuit to 200 with `{}` body without invoking the business handler.
- In `internal` mode, skip all HTTP middlewares (no parsing/negotiation/CORS/serialization) but still perform Zod validation.
- Be liberal on request parsing: never 415 on missing/mismatched content-type; only parse bodies for non‑GET/HEAD.
- Expose errors and map validation-shaped errors to HTTP 400.
*/
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

type ShapedResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
};

const isZodError = (
  e: unknown,
): e is {
  name?: unknown;
  issues?: unknown;
  message?: unknown;
} => {
  return (
    typeof e === 'object' &&
    e !== null &&
    (e as { name?: unknown }).name === 'ZodError'
  );
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
  /** used by the serializer’s logger fallback */
} & Partial<Loggable<Logger>>;

/** Build a single composed middleware stack in the correct order. */
export const buildMiddlewareStack = <
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
>(
  options: BuildStackOptions<EventSchema, ResponseSchema, Logger>,
): MiddlewareObj<APIGatewayProxyEvent, Context> => {
  const contentType = options.contentType ?? 'application/json';
  const logger = (options.logger ?? console) as unknown as Logger;
  const eventSchema = options.eventSchema;
  const responseSchema = options.responseSchema;

  // HEAD short-circuit — before everything else
  const mHead = shortCircuitHead;

  // Normalize headers and V1 events
  const mHeaderNormalizer = asApiMiddleware(
    httpHeaderNormalizer({ canonical: true }),
  );
  const mEventNormalizer = asApiMiddleware(httpEventNormalizer());

  // Parse Accept header early to populate request.preferredMediaTypes
  const mContentNegotiation = asApiMiddleware(
    httpContentNegotiation({
      availableCharsets: undefined,
      availableEncodings: undefined,
      availableLanguages: undefined,
      availableMediaTypes: [contentType],
      parseCharsets: false,
      parseEncodings: false,
      parseLanguages: false,
      parseMediaTypes: true,
    }),
  );

  // Content-type aware JSON body parser (only when body present; skip GET/HEAD)
  const mJsonBodyParser: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    before: async (request) => {
      const event = (request as unknown as { event?: APIGatewayProxyEvent })
        .event;
      if (!event) return;

      // Req: Only parse when it makes sense; avoid 415s on mismatches.
      const method = (
        (event as { httpMethod?: string }).httpMethod ??
        (event as { requestContext?: { http?: { method?: string } } })
          .requestContext?.http?.method ??
        ''
      ).toUpperCase();

      // Only parse when it makes sense
      if (method === 'GET' || method === 'HEAD') return;
      if (!event.body) return;

      // Don’t 415 on missing/mismatched content-type
      const inner = asApiMiddleware(
        httpJsonBodyParser({ disableContentTypeError: true }),
      );
      if (inner.before) await inner.before(request);
    },
  };

  // Expose preferred media types across the lifecycle (where present)
  const mPreferredMediaTypes: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    before: (request) => {
      const m = (
        request as unknown as {
          preferredMediaTypes?: string[];
        }
      ).preferredMediaTypes;
      if (!m) return;
      (
        request as unknown as { internal?: Record<string, unknown> }
      ).internal ??= {};
      (
        request as unknown as {
          internal?: { preferredMediaTypes?: string[] };
        }
      ).internal!.preferredMediaTypes = m;
    },
    after: (request) => {
      const m = (
        request as unknown as {
          internal?: { preferredMediaTypes?: string[] };
        }
      ).internal?.preferredMediaTypes;
      if (!m) return;
      (
        request as unknown as { preferredMediaTypes?: string[] }
      ).preferredMediaTypes = m;
    },
    onError: (request) => {
      const m = (
        request as unknown as {
          internal?: { preferredMediaTypes?: string[] };
        }
      ).internal?.preferredMediaTypes;
      if (!m) return;
      (
        request as unknown as { preferredMediaTypes?: string[] }
      ).preferredMediaTypes = m;
    },
  };

  // Zod validation (event + response)
  const mZodValidator = asApiMiddleware(
    httpZodValidator<EventSchema, ResponseSchema, Logger>({
      eventSchema,
      responseSchema,
      logger,
    }),
  );

  /**
   * AFTER: normalize ANY response (shaped or not) to a normalized HTTP response and
   * force the configured content type. This guarantees the serializer will
   * never produce a 415 for our happy paths.
   */
  const mShapeAndContentType: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    after: (request) => {
      const container = request as unknown as { response?: unknown };
      const current = container.response;
      if (!current || typeof current !== 'object') return;

      const looksShaped =
        'statusCode' in (current as Record<string, unknown>) &&
        'headers' in (current as Record<string, unknown>) &&
        'body' in (current as Record<string, unknown>);

      let res: ShapedResponse;
      if (looksShaped) {
        res = current as ShapedResponse;
      } else {
        res = { statusCode: 200, headers: {}, body: current };
      }

      // Ensure body is a string so the serializer won't 415
      if (res.body !== undefined && typeof res.body !== 'string') {
        try {
          res.body = JSON.stringify(res.body);
        } catch {
          // Req: Only stringify primitives safely; fall back to String()
          res.body = String(res.body);
        }
      }

      const headers = res.headers ?? {};
      headers['Content-Type'] = contentType;
      res.headers = headers;

      (request as unknown as { response: ShapedResponse }).response = res;
    },
  };

  /**
   * Expose errors and map validation-shaped ones to 400.
   * (Avoid unsafe stringification: only test regex when the message is a string.)
   */
  const mErrorExpose: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    onError: (request) => {
      const maybe = (request as { error?: unknown }).error;
      if (!(maybe instanceof Error)) return;
      // Avoid unsafe stringification; only regex-check when message is a string.
      const msg = typeof maybe.message === 'string' ? maybe.message : '';

      // Always expose errors from our handlers; map validation-shaped ones to 400.
      (maybe as { expose?: boolean }).expose = true;
      if (
        typeof (maybe as { statusCode?: unknown }).statusCode !== 'number' &&
        (isZodError(maybe) || /invalid (event|response)/i.test(msg))
      ) {
        (maybe as { statusCode?: number }).statusCode = 400;
      }
    },
  };

  // http-error-handler has nice defaults and respects `expose`/`statusCode`.
  const mErrorHandler = asApiMiddleware(
    httpErrorHandler({
      // Req: Avoid confusing void expression
      logger: (o) => {
        if (typeof (logger as { error?: unknown }).error === 'function') {
          (logger as unknown as { error: (o: unknown) => void }).error(o);
        }
      },
    }),
  );

  // CORS and response serializer
  const mCors = asApiMiddleware(
    httpCors({
      credentials: true,
      // getOrigin set to identity to preserve whatever the layer computed
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
          serializer: ({ body }) =>
            typeof body === 'string' ? body : JSON.stringify(body),
        },
      ],
      defaultContentType: contentType,
    }),
  );

  if (options.internal) {
    // Internal mode: only validation (no HTTP shaping/negotiation/parsing/etc.)
    return combine(mZodValidator);
  }

  // Header + event normalization should happen very early
  return combine(
    mHead,
    mHeaderNormalizer,
    mEventNormalizer,

    // BEFORE phases
    mContentNegotiation,
    mJsonBodyParser,
    mZodValidator,

    // AFTER / ERROR phases
    mErrorExpose,
    mErrorHandler,
    mCors,
    mPreferredMediaTypes, // set defaults across all phases
    mShapeAndContentType, // shape + normalize responses to the configured content type
    mResponseSerializer, // last
  );
};
