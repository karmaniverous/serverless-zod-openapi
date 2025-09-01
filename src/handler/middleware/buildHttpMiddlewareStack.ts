/**
 * HTTP middleware stack (HTTP-only).
 * Requirements:
 * - Normalize responses to an HTTP envelope and set Content-Type.
 * - Expose errors and map validation-shaped errors to HTTP 400.
 * - HEAD requests short-circuit to 200 with an empty JSON body.
 *
 * NOTE: Non-HTTP ("internal") paths are handled by makeWrapHandler by
 * bypassing Middy entirely. Do NOT add an internal toggle here.
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

import { wrapSerializer } from '@/src/handler/wrapSerializer';
import type { ConsoleLogger } from '@/src/types/Loggable';

import { asApiMiddleware } from './asApiMiddleware';
import { combine } from './combine';
import { httpZodValidator } from './httpZodValidator';
import { shortCircuitHead } from './shortCircuitHead';

type HttpEnvelope = {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
};

const isZodError = (
  e: unknown,
): e is { name?: unknown; issues?: unknown; message?: unknown } =>
  typeof e === 'object' &&
  e !== null &&
  'issues' in (e as Record<string, unknown>);

export type BuildHttpMiddlewareStackOptions<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
> = {
  eventSchema?: EventSchema;
  responseSchema?: ResponseSchema;
  /** default: 'application/json' */
  contentType?: string;
  /** optional logger (Console-compatible); defaults to console */
  logger?: ConsoleLogger;
};

/** Build the composed HTTP middleware stack in the correct order. */
export const buildHttpMiddlewareStack = <
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
>(
  options: BuildHttpMiddlewareStackOptions<EventSchema, ResponseSchema>,
): MiddlewareObj<APIGatewayProxyEvent, Context> => {
  const contentType = options.contentType ?? 'application/json';
  const logger: ConsoleLogger = options.logger ?? console;
  const eventSchema = options.eventSchema;
  const responseSchema = options.responseSchema;
  // HEAD short-circuit — before everything else
  const mHead = shortCircuitHead;

  // Normalize headers and V1 events — should happen very early
  const mHeaderNormalizer = asApiMiddleware(
    httpHeaderNormalizer({ canonical: true }),
  );
  const mEventNormalizer = asApiMiddleware(httpEventNormalizer());

  // Content-type aware JSON body parser (only when body present; skip GET/HEAD)
  const mJsonBodyParser: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    before: async (request) => {
      const event = (request as unknown as { event?: APIGatewayProxyEvent })
        .event;
      if (!event) return;

      const method = (
        event.httpMethod ||
        (
          event as unknown as {
            requestContext?: { http?: { method?: string } };
          }
        ).requestContext?.http?.method ||
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

  // Parse Accept header early to populate request.preferredMediaTypes
  const mContentNegotiation = asApiMiddleware(
    httpContentNegotiation({
      parseLanguages: false,
      parseCharsets: false,
      parseEncodings: false,
      availableMediaTypes: [contentType],
    }),
  );

  // Validate request BEFORE any content-type logic so Zod errors surface first.
  const zodOptions: {
    logger: ConsoleLogger;
    eventSchema?: EventSchema;
    responseSchema?: ResponseSchema;
  } = {
    logger,
    ...(eventSchema ? { eventSchema } : {}),
    ...(responseSchema ? { responseSchema } : {}),
  };
  const mZodValidator = asApiMiddleware(
    httpZodValidator<EventSchema, ResponseSchema, ConsoleLogger>(zodOptions),
  );

  /**
   * Provide a sane default for preferred media types in ALL phases.   * This prevents 415s when tests only run `.after()` or `.onError()` and when
   * no Accept header is present. Harmless if something else already set it.
   */
  const mPreferredMediaTypes: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    before: (request) => {
      const req = request as { preferredMediaTypes?: string[] };
      if (!Array.isArray(req.preferredMediaTypes)) {
        req.preferredMediaTypes = [contentType];
      }
      const ri = request as { internal?: Record<string, unknown> };
      if (!ri.internal) ri.internal = {};
      const internal = ri.internal as { preferredMediaTypes?: string[] };
      if (!Array.isArray(internal.preferredMediaTypes)) {
        internal.preferredMediaTypes = [contentType];
      }
    },
    after: (request) => {
      const req = request as { preferredMediaTypes?: string[] };
      if (!Array.isArray(req.preferredMediaTypes)) {
        req.preferredMediaTypes = [contentType];
      }
    },
    onError: (request) => {
      const req = request as { preferredMediaTypes?: string[] };
      if (!Array.isArray(req.preferredMediaTypes)) {
        req.preferredMediaTypes = [contentType];
      }
    },
  };

  /**
   * For HEAD, force a shaped 200 {} response BEFORE Zod-after runs
   * so response validation is skipped for HEAD only.
   */
  const mHeadFinalize: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    after: (request) => {
      const evt = (request as unknown as { event?: APIGatewayProxyEvent })
        .event;
      if (!evt) return;
      const method = (
        evt.httpMethod ||
        (evt as unknown as { requestContext?: { http?: { method?: string } } })
          .requestContext?.http?.method ||
        ''
      ).toUpperCase();
      if (method !== 'HEAD') return;
      (request as unknown as { response: HttpEnvelope }).response = {
        statusCode: 200,
        headers: { 'Content-Type': contentType },
        body: {},
      };
    },
  };

  // AFTER: normalize ANY response (shaped or not) to a normalized HTTP response and
  // force the configured content type.
  const mShapeAndContentType: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    after: (request) => {
      const container = request as unknown as { response?: unknown };
      const current = container.response;
      if (current === undefined) return;

      const looksShaped =
        typeof current === 'object' &&
        current !== null &&
        'statusCode' in (current as Record<string, unknown>) &&
        'headers' in (current as Record<string, unknown>) &&
        'body' in (current as Record<string, unknown>);

      let res: HttpEnvelope;
      if (looksShaped) {
        res = current as HttpEnvelope;
      } else {
        res = { statusCode: 200, headers: {}, body: current };
      }

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

      (request as unknown as { response: HttpEnvelope }).response = res;
    },
  };

  /**
   * Expose errors and map validation-shaped ones to 400 for HTTP mode.
   * (Avoid unsafe stringification: only test regex when the message is a string.)
   */
  const mErrorExpose: MiddlewareObj<APIGatewayProxyEvent, Context> = {
    onError: (request) => {
      const maybe = (request as { error?: unknown }).error;
      if (!(maybe instanceof Error)) return;
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
          serializer: wrapSerializer(
            ({ body }) =>
              typeof body === 'string' ? body : JSON.stringify(body),
            {
              label: 'json',
              logger,
            },
          ),
        },
      ],
      defaultContentType: contentType,
    }),
  );
  // Compose in the correct order (header/event normalization first, serializer last)
  return combine(
    mHead,
    mHeaderNormalizer,
    mEventNormalizer,
    // BEFORE phases
    mContentNegotiation,
    mJsonBodyParser,
    // HEAD-specific finalize to ensure envelope before Zod-after
    mHeadFinalize,
    mZodValidator,
    // AFTER / ERROR phases
    mErrorExpose,
    mErrorHandler,
    mCors,
    mPreferredMediaTypes, // defaults across phases
    mShapeAndContentType, // normalize + enforce Content-Type
    mResponseSerializer, // last
  );
};
