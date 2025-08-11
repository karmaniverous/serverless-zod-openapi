import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

/**
 * Middy typings are very generic. This helper narrows 3rd-party middlewares
 * to the API Gateway v1 handler shape we use across the codebase.
 */
export const asApiMiddleware = (
  m: MiddlewareObj,
): MiddlewareObj<APIGatewayProxyEvent, Context> =>
  m as MiddlewareObj<APIGatewayProxyEvent, Context>;
