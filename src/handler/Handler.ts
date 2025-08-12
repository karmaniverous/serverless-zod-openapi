// src/handler/Handler.ts
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger, Loggable } from '@/types/Loggable';

import type { SecurityContext } from './detectSecurityContext';

export type Merge<T, U> = Omit<T, keyof U> & U;

export type InferEvent<EventSchema extends z.ZodType> = Merge<
  APIGatewayProxyEvent,
  z.output<EventSchema>
>;

export type HandlerReturn<ResponseSchema extends z.ZodType | undefined> =
  ResponseSchema extends z.ZodType
    ? Promise<z.output<ResponseSchema>>
    : Promise<Record<string, never>>;

export type HandlerOptions<
  AP extends Record<string, unknown>,
  Keys extends keyof AP,
  Logger extends ConsoleLogger,
> = {
  env: Pick<AP, Keys>;
  securityContext: SecurityContext;
} & Loggable<Logger>;

/**
 * Handler signature: Keys is the union of env keys this handler receives.
 */
export type Handler<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  AP extends Record<string, unknown>,
  Keys extends keyof AP,
  Logger extends ConsoleLogger,
> = (
  event: InferEvent<EventSchema>,
  context: Context,
  options: HandlerOptions<AP, Keys, Logger>,
) => HandlerReturn<ResponseSchema>;
