import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger, Loggable } from '@/types/Loggable';

import type { SecurityContext } from './SecurityContext';

export type Merge<T, U> = Omit<T, keyof U> & U;

// Replace APIGatewayProxyEvent keys with the Zod-inferred ones where provided
export type InferEvent<EventSchema extends z.ZodType> = Merge<
  APIGatewayProxyEvent,
  z.output<EventSchema>
>;

// If a response schema is provided, the handler must return z.output<ResponseSchema>; else unknown
export type HandlerReturn<ResponseSchema extends z.ZodType | undefined> =
  ResponseSchema extends z.ZodType
    ? Promise<z.output<ResponseSchema>>
    : Promise<unknown>;

export type HandlerOptions<Logger extends ConsoleLogger> = {
  securityContext: SecurityContext;
} & Required<Loggable<Logger>>;

export type Handler<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
> = (
  event: InferEvent<EventSchema>,
  context: Context,
  options: HandlerOptions<Logger>,
) => HandlerReturn<ResponseSchema>;
