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

/** Universe of keys available to functions = global + stage. */
export type ParamUnion = GlobalParams & StageParams;

/**
 * Options passed to every handler. Includes logger, securityContext,
 * and a typed map of environment variables (exact Pick by Keys).
 */
export type HandlerOptions<
  Keys extends readonly (keyof ParamUnion)[],
  Logger extends ConsoleLogger,
> = {
  /** A typed map of environment variables exposed to the handler. */
  env: Pick<ParamUnion, Keys[number]>;
  /** The security context for the handler. */
  securityContext: SecurityContext;
} & Required<Pick<Loggable<Logger>, 'logger'>>;

/**
 * The type of a handler function.
 */
export type Handler<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Keys extends readonly (keyof ParamUnion)[],
  Logger extends ConsoleLogger,
> = (
  event: InferEvent<EventSchema>,
  context: Context,
  options: HandlerOptions<Keys, Logger>,
) => HandlerReturn<ResponseSchema>;

