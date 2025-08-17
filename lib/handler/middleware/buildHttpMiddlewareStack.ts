import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger } from '@@/lib/types/Loggable';

/**
 * REQUIREMENTS ADDRESSED
 * - Wrap ONLY HTTP handlers with middy.
 * - Always validate event/response when schemas are provided.
 * - HEAD requests short‑circuit to 200 and an empty JSON object.
 * - Never reshape in internal mode (used by non-HTTP tests/calls).
 * - Do not redefine ConsoleLogger; use the shared type.
 */
export type BuildHttpMiddlewareStackOptions<
  EventSchema extends z.ZodTypeAny | undefined,
  ResponseSchema extends z.ZodTypeAny | undefined,
> = {
  /** When true, skip HTTP shaping (used by internal tests only). */
  internal?: boolean;
  /** Optional schemas enforced before/after business logic. */
  eventSchema?: EventSchema;
  responseSchema?: ResponseSchema;
  /** Content-Type for shaped HTTP responses (default: application/json). */
  contentType?: string;
  /** Logger to use for debug output (default: console). */
  logger?: ConsoleLogger;
};

type ExposedError = Error & {
  expose?: boolean;
  statusCode?: number;
  issues?: unknown[];
};

/** Narrower serialization for debug logs to avoid circular refs. */
const safeLog = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
};

export const buildHttpMiddlewareStack = <
  EventSchema extends z.ZodTypeAny | undefined,
  ResponseSchema extends z.ZodTypeAny | undefined,
>(
  opts: BuildHttpMiddlewareStackOptions<EventSchema, ResponseSchema>,
): MiddlewareObj<APIGatewayProxyEvent, unknown> => {
  const {
    internal = false,
    eventSchema,
    responseSchema,
    contentType = 'application/json',
    logger = console,
  } = opts;

  const shape = (payload: unknown, statusCode = 200) => {
    const headers: Record<string, string> = { 'Content-Type': contentType };
    const body =
      typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
    return { statusCode, headers, body };
  };

  const validate = (
    value: unknown,
    schema: z.ZodTypeAny | undefined,
    kind: 'event' | 'response',
  ) => {
    if (!schema) return;
    logger.debug('validating with zod', safeLog(value));
    const res = schema.safeParse(value);
    if (!res.success) {
      const err: ExposedError = new Error(
        kind === 'event' ? 'Invalid input' : 'Invalid response',
      );
      err.expose = true;
      err.statusCode = kind === 'event' ? 400 : 500;
      err.issues = res.error.issues;
      throw err;
    }
  };

  const before: MiddlewareObj<APIGatewayProxyEvent, unknown>['before'] = async (
    request,
  ) => {
    const event = request.event as APIGatewayProxyEvent;
    // Validate even in internal mode; only shaping behavior differs.
    validate(event, eventSchema, 'event');

    if (!internal && event.httpMethod === 'HEAD') {
      // HEAD short‑circuit with shaped 200 {} and Content‑Type header.
      request.response = shape({});
    }
  };

  const after: MiddlewareObj<APIGatewayProxyEvent, unknown>['after'] = async (
    request,
  ) => {
    if (internal) {
      // Internal mode: never HTTP‑shape, only enforce response schema when provided.
      validate(request.response, responseSchema, 'response');
      return;
    }

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
