import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

export const noopMiddleware: MiddlewareObj<APIGatewayProxyEvent, Context> = {
  before: async () => {},
};
