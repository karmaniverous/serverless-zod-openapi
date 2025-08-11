import type { MiddlewareObj } from '@middy/core';
import multipart from '@middy/http-multipart-body-parser';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { shake } from 'radash';
import { z } from 'zod';

import { isMultipart } from '@/handler/middleware/isMultipart';
import type { ConsoleLogger } from '@/types/Loggable';

export type BuildStackOptions<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
> = {
  eventSchema: EventSchema;
  responseSchema?: ResponseSchema;
  contentType: string;
  logger?: Logger;
};

// Serialize handler output into API Gateway v1 shape.
const serializeResponse = (
  payload: unknown,
): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} => {
  // Use shake so optional headers (e.g., trace IDs) can be added later without undefined.
  const headers = shake({
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  });

  if (typeof payload === 'string') {
    return { statusCode: 200, headers, body: payload };
  }
  return { statusCode: 200, headers, body: JSON.stringify(payload ?? {}) };
};

export const buildMiddlewareStack = <
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
>(
  opts: BuildStackOptions<EventSchema, ResponseSchema, Logger>,
): MiddlewareObj<APIGatewayProxyEvent, unknown> => {
  const parser = multipart();

  return {
    // Auto multipart: invoke parser only when request is truly multipart
    before: async (request) => {
      const event = request.event;

      // Validate event (fail-fast with 400 on schema errors)
      const v = opts.eventSchema.safeParse(event);
      if (!v.success) throw v.error;

      if (isMultipart(event) && typeof parser.before === 'function') {
        await parser.before(request);
      }
    },

    after: async (request) => {
      const res = request.response;

      // Pass through if handler already returned a full response
      if (
        res &&
        typeof res === 'object' &&
        'statusCode' in (res as Record<string, unknown>)
      ) {
        return;
      }

      request.response = serializeResponse(res);
    },

    onError: async (request) => {
      const err = request.error;
      const statusCode = err instanceof z.ZodError ? 400 : 500;

      const body =
        err instanceof Error
          ? JSON.stringify({ message: err.message })
          : JSON.stringify({ message: 'Unhandled error' });

      request.response = {
        statusCode,
        headers: shake({
          'Access-Control-Allow-Credentials': 'true',
          'Content-Type': 'application/json',
        }),
        body,
      };
    },
  };
};
