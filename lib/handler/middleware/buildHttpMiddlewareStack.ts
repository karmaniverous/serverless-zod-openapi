import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger } from '@@/lib/types/Loggable';

export type BuildHttpMiddlewareStackOptions<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
> = {
  eventSchema?: EventSchema;
  responseSchema?: ResponseSchema;
  contentType?: string;
  logger?: ConsoleLogger;
};

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
        statusCode?: number;
        issues?: unknown;
      };
      e.expose = true;
      e.statusCode = side === 'event' ? 400 : 500;
      e.issues = result.error.issues;
      throw e;
    }
  };

  return {
    before: async (request) => {
      if (request.event.httpMethod === 'HEAD') {
        request.response = shape({});
        return;
      }
      validate(request.event, eventSchema, 'event');
    },
    after: async (request) => {
      if (request.event.httpMethod === 'HEAD') {
        request.response = shape({});
        return;
      }

      const maybe = request.response;

      const looksShaped =
        !!maybe &&
        typeof maybe === 'object' &&
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

      if (typeof maybe === 'string') {
        request.response = shape(maybe);
        return;
      }

      validate(maybe, responseSchema, 'response');
      request.response = shape(maybe);
    },
    onError: async (request) => {
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
        const status = exposed.statusCode ?? 400;
        const payload = exposed.issues
          ? { issues: exposed.issues }
          : { message: exposed.message ?? 'Bad Request' };
        request.response = shape(payload, status);
        return;
      }
      throw err instanceof Error ? err : new Error(String(err));
    },
  };
};
