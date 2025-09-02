/* REQUIREMENTS ADDRESSED
- For HTTP HEAD requests, short-circuit the handler and return 200 with an empty JSON object body.
- Do not run the business handler when short-circuiting.
- Allow downstream middlewares to continue shaping (e.g., serializer, headers).
*/
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
 *
 * @remarks
 * This is placed very early in the pipeline. When it sets `request.response`
 * during `before`, the composed middleware sequence will skip the base handler.
 */
export const shortCircuitHead: MiddlewareObj<APIGatewayProxyEvent, Context> = {
  before: async (request) => {    const evt = request.event as unknown as {
      httpMethod?: string;
      requestContext?: { http?: { method?: string } };
    };
    const method = (
      evt.httpMethod ??
      evt.requestContext?.http?.method ??
      ''
    ).toUpperCase();
    if (method === 'HEAD') {
      (request as unknown as { response?: ShapedResponse }).response = {
        statusCode: 200,
        headers: {},
        body: {},
      };
    }
  },
};
