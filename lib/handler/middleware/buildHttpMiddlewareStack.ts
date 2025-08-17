/**
 * REQUIREMENTS ADDRESSED
 * - HTTP-only middleware stack for middy.
 * - In HTTP mode: shape to {statusCode, headers, body}, set Content-Type, catch Zod -> 400.
 * - In internal mode: do NOT shape; validate event/response and throw on failure ("Invalid response").
 * - Provide verbose zod debug logs via logger to match test expectations.
 */

import type { MiddlewareObj } from '@middy/core';
import type { z } from 'zod';

import { pojofy } from '@@/lib/pojofy';
import type { ConsoleLogger } from '@@/lib/types/Loggable';

export type BuildHttpMiddlewareStackOptions<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
> = {
  /** content type for HTTP responses (default is provided by wrapper) */
  contentType?: string;

  /** event/response schemas (optional) */
  eventSchema?: EventSchema;
  responseSchema?: ResponseSchema;

  /** test hook: when true, skip shaping and throw on invalids */
  internal: boolean;

  /** logger */
  logger: Logger;
};

const shapeHttp = (
  payload: unknown,
  contentType: string,
  headers: Record<string, string> = {},
) => ({
  statusCode: 200,
  headers: { 'Content-Type': contentType, ...headers },
  body: JSON.stringify(payload ?? {}),
});

const isZodError = (
  e: unknown,
): e is Error & { issues?: unknown[]; expose?: boolean; statusCode?: number } =>
  !!e && typeof e === 'object' && (e as { name?: string }).name === 'ZodError';

export const buildHttpMiddlewareStack = <
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
>(
  opts: BuildHttpMiddlewareStackOptions<EventSchema, ResponseSchema, Logger>,
): MiddlewareObj => {
  const {
    contentType = 'application/json',
    eventSchema,
    responseSchema,
    internal,
    logger,
  } = opts;

  const validateEvent = (value: unknown) => {
    if (!eventSchema) return;
    logger.debug('validating with zod', pojofy(value));
    const r = eventSchema.safeParse(value);
    if (r.success) {
      logger.debug('zod validation succeeded', pojofy(r));
      return;
    }
    const err = Object.assign(new Error('Invalid input'), {
      name: 'ZodError',
      issues: r.error.issues,
      expose: true,
      statusCode: 400,
    });
    if (internal) throw err;
    // HTTP mode: handled in onError below
    throw err;
  };

  const validateResponse = (value: unknown) => {
    if (!responseSchema) return;
    logger.debug('validating with zod', pojofy(value));
    const r = responseSchema.safeParse(value);
    if (r.success) {
      logger.debug('zod validation succeeded', pojofy(r));
      return;
    }
    // Internal mode throws with message expected by tests
    const err = Object.assign(new Error('Invalid response'), {
      name: 'ZodError',
      issues: r.error.issues,
      expose: true,
      statusCode: 400,
    });
    throw err;
  };

  return {
    before: async (request) => {
      // HEAD short-circuit in HTTP mode only
      if (!internal) {
        const evt = request.event as {
          httpMethod?: string;
          requestContext?: { http?: { method?: string } };
        };
        const method =
          evt?.httpMethod ?? evt?.requestContext?.http?.method ?? undefined;

        // Validate event in HTTP mode before handler
        validateEvent(request.event);

        if (method === 'HEAD') {
          // Produce shaped empty result and *skip* handler
          request.response = shapeHttp({}, contentType);
        }
      } else {
        // Internal mode: validate event but do NOT shape
        validateEvent(request.event);
      }
    },

    after: async (request) => {
      if (internal) {
        // Internal: do NOT shape; validate response and leave it as-is
        validateResponse(request.response);
        return;
      }

      // HTTP: if something already set a response (e.g., HEAD), preserve it but ensure Content-Type
      if (request.response) {
        const r = request.response as {
          statusCode?: number;
          headers?: Record<string, string>;
          body?: unknown;
        };
        const headers: Record<string, string> = { ...(r.headers ?? {}) };
        // Ensure Content-Type is set
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = contentType;
        }
        request.response = {
          statusCode: r.statusCode ?? 200,
          headers,
          body:
            typeof r.body === 'string' ? r.body : JSON.stringify(r.body ?? {}),
        };
        return;
      }

      // Shape the handler's raw result
      const shaped = shapeHttp(request.response, contentType);
      request.response = shaped;
    },

    onError: async (request) => {
      const err = request.error;

      if (internal) {
        // Internal: rethrow (tests assert throw)
        throw err;
      }

      // HTTP: Map ZodError to 400, else 500
      if (isZodError(err)) {
        request.response = {
          statusCode: err.statusCode ?? 400,
          headers: {
            'Content-Type': contentType,
            'Access-Control-Allow-Credentials': 'true',
          },
          body: JSON.stringify(err.issues ?? []),
        };
        return;
      }

      request.response = {
        statusCode: 500,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          message: (err as { message?: unknown })?.message ?? 'Internal error',
        }),
      };
    },
  };
};
