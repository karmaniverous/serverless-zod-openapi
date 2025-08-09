import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger, Loggable } from '@/types/Loggable';

import type { SecurityContext } from './SecurityContext';

export type Merge<T, U> = Omit<T, keyof U> & U;

// Replace APIGatewayProxyEvent keys with the Zod-inferred ones where provided
export type InferEvent<E extends z.ZodType> = Merge<
  APIGatewayProxyEvent,
  z.output<E>
>;

// If a response schema is provided, the handler must return z.output<R>; else unknown
export type HandlerReturn<R extends z.ZodType | undefined> = R extends z.ZodType
  ? Promise<z.output<R>>
  : Promise<unknown>;

export type HandlerOptions<Logger extends ConsoleLogger> = {
  securityContext: SecurityContext;
} & Required<Loggable<Logger>>;

export type Handler<
  E extends z.ZodType,
  R extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
> = (
  event: InferEvent<E>,
  context: Context,
  options: HandlerOptions<Logger>,
) => HandlerReturn<R>;
