import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

type ShapedResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
};

/**
 * If the request is HEAD, short-circuit the handler and let the serializer
 * produce an empty JSON body. This keeps tests and clients predictable.
 */
export const shortCircuitHead: MiddlewareObj<APIGatewayProxyEvent, Context> = {
  before: async (request) => {
    const evt = request.event as unknown as {
      httpMethod?: string;
      requestContext?: { http?: { method?: string } };
    };
    const method = (
      evt.httpMethod ??
      evt.requestContext?.http?.method ??
      ''
    ).toUpperCase();
    if (method === 'HEAD') {
      (request as unknown as { earlyResponse?: ShapedResponse }).earlyResponse =
        {
          statusCode: 200,
          headers: {},
          body: {},
        };
    }
  },
};
