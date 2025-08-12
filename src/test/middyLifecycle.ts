import type { MiddlewareObj } from '@middy/core';
import type { Context } from 'aws-lambda';

export type MiddyReq = {
  event: unknown;
  context?: Context;
  response?: unknown;
  error?: unknown;
  internal?: Record<string, unknown>;
};

export const runBefore = async (
  stack: MiddlewareObj,
  req: MiddyReq,
): Promise<void> => {
  if (stack.before) await stack.before(req as never);
};

export const runAfter = async (
  stack: MiddlewareObj,
  req: MiddyReq,
): Promise<void> => {
  if (stack.after) await stack.after(req as never);
};

export const runOnError = async (
  stack: MiddlewareObj,
  req: MiddyReq,
): Promise<void> => {
  if (stack.onError && req.error) await stack.onError(req as never);
};
