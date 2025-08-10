import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { get } from 'radash';

export const shortCircuitHead: MiddlewareObj<APIGatewayProxyEvent, Context> = {
  before: async (request) => {
    const method = get(
      request.event as unknown as { httpMethod?: string },
      'httpMethod',
    );
    if (method === 'HEAD') {
      // Setting a response in `before` short-circuits the stack.
      request.response = {} as Context;
    }
  },
};
