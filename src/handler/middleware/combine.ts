import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

/**
 * Combine several middlewares into one (order-preserving).
 */
export const combine = (
  ...parts: MiddlewareObj<APIGatewayProxyEvent, Context>[]
): MiddlewareObj<APIGatewayProxyEvent, Context> => {
  const befores = parts.map((m) => m.before).filter(Boolean) as NonNullable<
    MiddlewareObj['before']
  >[];
  const afters = parts.map((m) => m.after).filter(Boolean) as NonNullable<
    MiddlewareObj['after']
  >[];
  const onErrors = parts.map((m) => m.onError).filter(Boolean) as NonNullable<
    MiddlewareObj['onError']
  >[];

  return {
    before: async (request) => {
      for (const fn of befores) await fn(request);
    },
    after: async (request) => {
      for (const fn of afters) await fn(request);
    },
    onError: async (request) => {
      for (const fn of onErrors) await fn(request);
    },
  };
};
