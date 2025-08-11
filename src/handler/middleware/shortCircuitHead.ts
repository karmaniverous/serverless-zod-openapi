import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

/**
 * If the request is HEAD, short-circuit the handler and let the serializer
 * produce an empty JSON body. This keeps tests and clients predictable.
 */
export const shortCircuitHead: MiddlewareObj<APIGatewayProxyEvent, Context> = {
  before: async (request) => {
    const method = request.event.httpMethod.toUpperCase();
    if (method === 'HEAD') {
      // Returning early by setting a response is enough; Middy will still run
      // AFTER middlewares (serializer, CORS) to finish the response.
      request.response = {} as Context;
    }
  },
};
