// src/handler/middleware/combine.ts
import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

type ApiMiddleware = MiddlewareObj<APIGatewayProxyEvent, Context>;

const isDefined = <T>(v: T | undefined | null): v is T =>
  v !== undefined && v !== null;

/**
 * Compose many Middy middlewares into one. Respects short-circuiting:
 * if a `before` sets `request.response`, remaining `before`s are skipped.
 */
export const combine = (...mws: ApiMiddleware[]): ApiMiddleware => {
  const befores = mws.map((m) => m.before).filter(isDefined);
  const afters = mws.map((m) => m.after).filter(isDefined);
  const onErrors = mws.map((m) => m.onError).filter(isDefined);

  return {
    before: async (request) => {
      for (const fn of befores) {
        await fn(request);
        if (request.response !== null) return;
      }
    },
    after: async (request) => {
      for (const fn of afters) {
        await fn(request);
      }
    },
    onError: async (request) => {
      for (const fn of onErrors) {
        await fn(request);
      }
    },
  };
};
