// src/handler/middleware/asApiMiddleware.ts
import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

/**
 * Narrow a third-party Middy middleware to the API Gateway / Lambda Context
 * pair we use everywhere else. Keep this cast isolated at the boundary.
 */
export const asApiMiddleware = (
  mw: unknown, // accept anything; we own the single cast here
): MiddlewareObj<APIGatewayProxyEvent, Context> =>
  mw as MiddlewareObj<APIGatewayProxyEvent, Context>;
