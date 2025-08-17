import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger } from '@@/lib/types/Loggable';

/**
 * REQUIREMENTS ADDRESSED
 * - Wrap ONLY HTTP handlers with middy.
 * - Always validate event/response when schemas are provided.
 * - HEAD requests short‑circuit to 200 and an empty JSON object.
 * - Do not redefine ConsoleLogger; use the shared type.
 * - Options no longer include `internal`; middleware is HTTP-only by definition.
 */
export type BuildHttpMiddlewareStackOptions<
  EventSchema extends z.ZodTypeAny | undefined,
  ResponseSchema extends z.ZodTypeAny | undefined,
> = {
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

const validate = <T>(
  payload: unknown,
  schema: z.ZodTypeAny | undefined,
  kind: 'event' | 'response',
): asserts payload is T => {
  if (!schema) return;
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const e = new Error(`Invalid ${kind}`) as Error & {
      expose: boolean;
      statusCode: number;
      issues: unknown[];
    };
    e.expose = true;
    e.statusCode = 400;
    e.issues = parsed.error.issues;
    throw e;
  }
};

export const buildHttpMiddlewareStack = <
  EventSchema extends z.ZodTypeAny | undefined,
  ResponseSchema extends z.ZodTypeAny | undefined,
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
    } else {
      try {
        body = JSON.stringify(payload);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : 'Failed to serialize response';
        logger.error({ message: msg });
        body = JSON.stringify({ message: msg });
      }
    }
    return { statusCode, headers, body };
  };

  const before: MiddlewareObj<APIGatewayProxyEvent, unknown>['before'] = async (
    request,
  ) => {
    const event = request.event as APIGatewayProxyEvent;
    // Validate the event before shaping.
    validate(event, eventSchema, 'event');

    if (event.httpMethod === 'HEAD') {
      // HEAD short‑circuit with shaped 200 {} and Content‑Type header.
      request.response = shape({});
    }
  };

  const after: MiddlewareObj<APIGatewayProxyEvent, unknown>['after'] = async (
    request,
  ) => {
    // If base already returned an HTTP-shaped object, preserve it and ensure Content‑Type.
    const maybe = request.response as unknown as
      | { statusCode?: unknown; headers?: unknown; body?: unknown }
      | undefined;
    if (
      maybe &&
      typeof maybe === 'object' &&
      'statusCode' in maybe &&
      'headers' in maybe &&
      'body' in maybe
    ) {
      const headers = Object.assign(
        {},
        ((maybe as { headers?: Record<string, string> }).headers ??
          {}) as Record<string, string>,
      );
      headers['Content-Type'] = contentType;
      request.response = {
        statusCode: Number(
          (maybe as { statusCode?: number }).statusCode ?? 200,
        ),
        headers,
        body: (maybe as { body?: string }).body ?? '',
      };
      return;
    }

    // Validate business payload and shape to HTTP.
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
    // Re‑throw non‑exposed errors so outer infrastructure (tests / AWS) can handle.
    throw err instanceof Error ? err : new Error(String(err));
  };

  return { before, after, onError };
};
