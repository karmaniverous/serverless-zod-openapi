import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

export const asApiMiddleware = <
  E,
  Ctx,
  Err,
  C extends Context,
  Opts extends Record<string, unknown>,
>(
  m: MiddlewareObj<E, Ctx, Err, C, Opts>,
): MiddlewareObj<APIGatewayProxyEvent, Context> =>
  m as unknown as MiddlewareObj<APIGatewayProxyEvent, Context>;
