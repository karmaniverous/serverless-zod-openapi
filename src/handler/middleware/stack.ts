import type { MiddlewareObj } from '@middy/core';
// TODO: Fix multipart.
// import multipart from '@middy/http-multipart-body-parser';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { HttpError } from 'http-errors';
import { shake } from 'radash';
import { z } from 'zod';

// TODO: Fix multipart.
// import { isMultipart } from '@/handler/middleware/isMultipart';
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
  contentType: string,
): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} => {
  const headers = shake({
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': contentType,
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
  // TODO: Fix multipart.
  // const parser = multipart();

  return {
    // Validate the incoming event; (optional) run multipart parser.
    before: async (request) => {
      const event = request.event;

      const v = opts.eventSchema.safeParse(event);
      if (!v.success) throw v.error;

      // TODO: Fix multipart.
      // if (isMultipart(event) && typeof parser.before === 'function') {
      //   await parser.before(request);
      // }
    },

    // Validate *object-like* responses and always serialize to API GW v1.
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

      // Only validate JSON-like payloads; primitives like string/number/boolean bypass
      if (opts.responseSchema && (res === null || typeof res === 'object')) {
        const v = opts.responseSchema.safeParse(res);
        if (!v.success) throw v.error; // onError will map ZodError -> 400
      }

      request.response = serializeResponse(res, opts.contentType);
    },

    // Map ZodError -> 400; honor HttpError status/expose; default to 500.
    onError: async (request) => {
      const err = request.error as Partial<HttpError> & Error;

      const hasHttpStatus =
        typeof err.statusCode === 'number' || typeof err.status === 'number';
      const isHttpLike =
        hasHttpStatus ||
        typeof err.expose === 'boolean' ||
        typeof (err as { headers?: unknown }).headers === 'object';

      const statusCode =
        typeof err.statusCode === 'number'
          ? err.statusCode
          : typeof err.status === 'number'
            ? err.status
            : err instanceof z.ZodError
              ? 400
              : 500;

      // Respect explicit headers if provided by a thrown HttpError
      const providedHeaders =
        typeof (err as { headers?: unknown }).headers === 'object' &&
        (err as { headers?: Record<string, string> }).headers
          ? (err as { headers?: Record<string, string> }).headers
          : {};

      const headers = {
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': opts.contentType,
        ...providedHeaders,
      };

      // Expose rules:
      // - ZodError: expose details
      // - http-errors: honor err.expose (default expose 4xx)
      // - plain Error: expose by default (matches previous behavior/tests)
      const expose =
        err instanceof z.ZodError
          ? true
          : isHttpLike
            ? typeof err.expose === 'boolean'
              ? err.expose
              : statusCode < 500
            : true;

      const message =
        err instanceof z.ZodError
          ? err.message
          : expose && err.message
            ? err.message
            : 'Unhandled error';

      request.response = {
        statusCode,
        headers,
        body: JSON.stringify({ message }),
      };
    },
  };
};
