import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

/** A do-nothing middleware used to toggle optional features cleanly. */
export const noopMiddleware: MiddlewareObj<APIGatewayProxyEvent, Context> = {
  // all optional; left blank on purpose
};
