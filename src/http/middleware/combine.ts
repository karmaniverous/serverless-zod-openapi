import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

/**
 * Combine several middlewares into one (order-preserving).
 *
 * @param parts - middlewares to compose
 * @returns a middleware that calls before/after/onError in sequence
 * @remarks
 * If a previous middleware sets `request.response` during `before`, the
 * sequence will stop early so the base handler is skipped (e.g. HEAD).
 */
export const combine = (
  ...parts: MiddlewareObj<APIGatewayProxyEvent, Context>[]
): MiddlewareObj<APIGatewayProxyEvent, Context> => {  const befores = parts.map((m) => m.before).filter(Boolean) as NonNullable<
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
      for (const fn of befores) {
        await fn(request);
        // If a prior middleware has produced a response (e.g., HEAD short-circuit),
        // exit early so the base handler will be skipped by Middy.
        if ((request as { response?: unknown }).response !== undefined) return;
      }
    },
    after: async (request) => {
      for (const fn of afters) await fn(request);
    },
    onError: async (request) => {
      for (const fn of onErrors) await fn(request);
    },
  };
};
