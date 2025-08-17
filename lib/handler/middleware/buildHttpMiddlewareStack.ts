import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger } from '@@/lib/types/Loggable';

export type BuildHttpMiddlewareStackOptions<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
> = {
  /** Optional schemas enforced before/after business logic. */
  eventSchema?: EventSchema;
  responseSchema?: ResponseSchema;

  /** Response content type (default: application/json). */
  contentType?: string;

  /** Logger for validation/shaping; must extend ConsoleLogger if provided. */
  logger?: ConsoleLogger;
};

/** Build Middy middleware stack for HTTP handlers. */
export const buildHttpMiddlewareStack = <
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
>({
  eventSchema,
  responseSchema,
  contentType = 'application/json',
  logger = console,
}: BuildHttpMiddlewareStackOptions<EventSchema, ResponseSchema>): MiddlewareObj<
  APIGatewayProxyEvent,
  unknown
> => {
  const validate = (
    value: unknown,
    schema: z.ZodType | undefined,
    side: 'event' | 'response',
  ) => {
    if (!schema) return;
    const result = schema.safeParse(value);
    if (!result.success) {
      const e = new Error(`Invalid ${side}`);
      (e as unknown as { expose: boolean }).expose = true;
      (e as unknown as { issues: unknown }).issues = result.error.issues;
      throw e;
    }
  };

  const shape = (payload: unknown, statusCode = 200) => {
    const headers: Record<string, string> = { 'Content-Type': contentType };
    let body = '';
    if (typeof payload === 'string') {
      body = payload;
    } else {
      try {
        body = JSON.stringify(payload);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to serialize response';
        logger.error({ message: msg });
        body = JSON.stringify({ message: msg });
      }
    }
    return { statusCode, headers, body };
  };

  const before: MiddlewareObj<APIGatewayProxyEvent, unknown>['before'] = async (
    request,
  ) => {
    // HEAD short-circuit early
    if (request.event.httpMethod === 'HEAD') {
      request.response = shape({});
      return;
    }
    validate(request.event, eventSchema, 'event');
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
    const looksShaped =
      typeof maybe === 'object' &&
      maybe !== null &&
      'statusCode' in (maybe as Record<string, unknown>) &&
      'headers' in (maybe as Record<string, unknown>) &&
      'body' in (maybe as Record<string, unknown>);

    if (looksShaped) {
      const shaped = maybe as {
        statusCode?: number;
        headers?: Record<string, string>;
        body?: string;
      };
      const headers = {
        ...(shaped.headers ?? {}),
        'Content-Type': contentType,
      };
      request.response = {
        statusCode: shaped.statusCode ?? 200,
        headers,
        body: shaped.body ?? '',
      };
      return;
    }

    // If base returned a raw string, preserve it verbatim.
    if (typeof maybe === 'string') {
      request.response = shape(maybe);
      return;
    }

    // Validate the unshaped payload against response schema (if provided), then shape.
    validate(maybe, responseSchema, 'response');
    request.response = shape(maybe);
  };

  const onError: MiddlewareObj<
    APIGatewayProxyEvent,
    unknown
  >['onError'] = async (request) => {
    const err = request.error;
    if (
      err &&
      typeof err === 'object' &&
      (err as { expose?: boolean }).expose
    ) {
      const exposed = err as {
        statusCode?: number;
        issues?: unknown;
        message?: string;
      };
      const statusCode = exposed.statusCode ?? 400;
      const payload = exposed.issues
        ? { issues: exposed.issues }
        : { message: exposed.message ?? 'Bad Request' };
      request.response = shape(payload, statusCode);
      return;
    }
    throw err instanceof Error ? err : new Error(String(err));
  };

  return { before, after, onError };
};
