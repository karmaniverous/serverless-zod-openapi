import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger } from '@@/lib/types/Loggable';

/**
 * File-specific: HTTP middleware for validation/shaping.
 * Cross-cutting rules: see /requirements.md (logging, HEAD semantics).
 */
export type BuildHttpMiddlewareStackOptions<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
> = {
  /** Optional schemas enforced before/after business logic. */
  eventSchema?: EventSchema;
  responseSchema?: ResponseSchema;
  /** Content-Type for shaped HTTP responses (default: application/json). */
  contentType?: string;
  logger?: ConsoleLogger;
};

type ExposedError = Error & {
  expose?: boolean;
  statusCode?: number;
  issues?: unknown[];
};

export const buildHttpMiddlewareStack = <
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
>(
  opts: BuildHttpMiddlewareStackOptions<EventSchema, ResponseSchema>,
): MiddlewareObj<APIGatewayProxyEvent, unknown> => {
  const {
    eventSchema,
    responseSchema,
    contentType = 'application/json',
    logger = console,
  } = opts;

  const shape = (payload: unknown, statusCode = 200) => {
    const headers: Record<string, string> = { 'Content-Type': contentType };
    let body = '';
    if (typeof payload === 'string') {
      body = payload;
    } else if (payload !== undefined) {
      try {
        body = JSON.stringify(payload);
      } catch (e) {
        logger.error('Failed to JSON.stringify payload', e);
        body = '';
      }
    }
    return { statusCode, headers, body };
  };

  const validate = (
    value: unknown,
    schema: z.ZodType | undefined,
    side: 'event' | 'response',
  ) => {
    if (!schema) return;
    const result = schema.safeParse(value);
    if (!result.success) {
      const e = new Error(`Invalid ${side}`) as Error & {
        expose: boolean;
        statusCode: number;
        issues: unknown[];
      };
      e.expose = true;
      e.statusCode = side === 'event' ? 400 : 500;
      e.issues = result.error.issues;
      throw e;
    }
  };

  const before: MiddlewareObj<APIGatewayProxyEvent, unknown>['before'] = async (
    request,
  ) => {
    validate(request.event, eventSchema, 'event');
    if (request.event.httpMethod === 'HEAD') {
      // Short‑circuit immediately; after() will also ensure HEAD stays empty.
      request.response = shape({});
    }
  };

  const after: MiddlewareObj<APIGatewayProxyEvent, unknown>['after'] = async (
    request,
  ) => {
    // Hard override for HEAD: ignore business payloads entirely.
    if (request.event.httpMethod === 'HEAD') {
      request.response = shape({});
      return;
    }

    // If base already returned an HTTP-shaped object, preserve it and ensure Content‑Type.
    const maybe = request.response;
    if (
      maybe &&
      typeof maybe === 'object' &&
      'statusCode' in (maybe as Record<string, unknown>) &&
      'headers' in (maybe as Record<string, unknown>) &&
      'body' in (maybe as Record<string, unknown>)
    ) {
      const hdrs =
        (maybe as { headers?: Record<string, string> }).headers ?? {};
      const headers: Record<string, string> = {
        ...hdrs,
        'Content-Type': contentType,
      };
      const statusCode =
        typeof (maybe as { statusCode?: number }).statusCode === 'number'
          ? (maybe as { statusCode?: number }).statusCode!
          : 200;
      const body = (maybe as { body?: string }).body ?? '';
      request.response = { statusCode, headers, body };
      return;
    }

    // Otherwise, shape the raw business result.
    validate(request.response, responseSchema, 'response');
    request.response = shape(request.response);
  };

  const onError: MiddlewareObj<
    APIGatewayProxyEvent,
    unknown
  >['onError'] = async (request) => {
    const err = request.error;
    if (err && typeof err === 'object' && (err as ExposedError).expose) {
      const exposed = err as ExposedError;
      const statusCode = exposed.statusCode ?? 400;
      const payload = exposed.issues
        ? { issues: exposed.issues }
        : { message: exposed.message };
      request.response = shape(payload, statusCode);
      return;
    }
    throw err instanceof Error ? err : new Error(String(err));
  };

  return { before, after, onError };
};
