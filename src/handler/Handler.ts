import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import type { GlobalParams } from '@/serverless/stages/globalSchema';
import type { StageParams } from '@/serverless/stages/stageSchema';
import type { ConsoleLogger, Loggable } from '@/types/Loggable';

import type { SecurityContext } from './SecurityContext';

/**
 * Merges two types, overwriting keys in `T` with keys in `U`.
 */
export type Merge<T, U> = Omit<T, keyof U> & U;

/**
 * Infers the type of the event object from a Zod schema.
 */
export type InferEvent<EventSchema extends z.ZodType> = Merge<
  APIGatewayProxyEvent,
  z.output<EventSchema>
>;

/**
 * Infers the return type of a handler from a Zod schema.
 */
export type HandlerReturn<ResponseSchema extends z.ZodType | undefined> =
  ResponseSchema extends z.ZodType
    ? Promise<z.output<ResponseSchema>>
    : Promise<unknown>;

/**
 * Options passed to every handler.  Includes logger, securityContext,
 * and a typed map of environment variables.
 *
 * @template Env  The type of the parsed environment object.
 * @template Logger The type of the logger.
 */
export type HandlerOptions<
  Env extends GlobalParams & StageParams,
  Logger extends ConsoleLogger,
> = {
  /**
   * A typed map of environment variables exposed to the handler.
   */
  env: Env;
  /**
   * The security context for the handler.
   */
  securityContext: SecurityContext;
} & Required<Pick<Loggable<Logger>, 'logger'>>;

/**
 * The type of a handler function.
 *
 * @template EventSchema The Zod schema for the event.
 * @template ResponseSchema The Zod schema for the response.
 * @template Env The type of the parsed environment passed in options.
 * @template Logger The type of the logger.
 */
export type Handler<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Env extends GlobalParams & StageParams,
  Logger extends ConsoleLogger,
> = (
  event: InferEvent<EventSchema>,
  context: Context,
  options: HandlerOptions<Env, Logger>,
) => HandlerReturn<ResponseSchema>;

