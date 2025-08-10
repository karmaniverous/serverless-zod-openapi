import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger, Loggable } from '@/types/Loggable';

import type { SecurityContext } from './SecurityContext';

/**
 * Merges two types, overwriting keys in `T` with keys in `U`.
 */
export type Merge<T, U> = Omit<T, keyof U> & U;

/**
 * Infers the type of the event object from a Zod schema.
 *
 * @template EventSchema The Zod schema for the event.
 */
export type InferEvent<EventSchema extends z.ZodType> = Merge<
  APIGatewayProxyEvent,
  z.output<EventSchema>
>;

/**
 * Infers the return type of a handler from a Zod schema.
 *
 * @template ResponseSchema The Zod schema for the response.
 */
export type HandlerReturn<ResponseSchema extends z.ZodType | undefined> =
  ResponseSchema extends z.ZodType
    ? Promise<z.output<ResponseSchema>>
    : Promise<unknown>;

/**
 * The options for a handler.
 *
 * @template Logger The type of the logger.
 */
export type HandlerOptions<Logger extends ConsoleLogger> = {
  /**
   * The security context for the handler.
   */
  securityContext: SecurityContext;
} & Required<Loggable<Logger>>;

/**
 * The type of a handler function.
 *
 * @template EventSchema The Zod schema for the event.
 * @template ResponseSchema The Zod schema for the response.
 * @template Logger The type of the logger.
 */
export type Handler<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
> = (
  event: InferEvent<EventSchema>,
  context: Context,
  options: HandlerOptions<Logger>,
) => HandlerReturn<ResponseSchema>;