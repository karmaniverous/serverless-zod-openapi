import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

/**
 * Coerce a generic Middy middleware into an API‑Gateway‑typed middleware.
 * @category HTTP Middleware
 * @category Public API
 *
 * @param m - middleware object (any event/context signature)
 * @returns middleware object typed to (APIGatewayProxyEvent, Context) */
export const asApiMiddleware = <
  E,
  Ctx,
  Err,
  C extends Context,  Opts extends Record<string, unknown>,
>(
  m: MiddlewareObj<E, Ctx, Err, C, Opts>,
): MiddlewareObj<APIGatewayProxyEvent, Context> =>
  m as unknown as MiddlewareObj<APIGatewayProxyEvent, Context>;
