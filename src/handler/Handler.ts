import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import type { AllParams } from '@/serverless/stages';
import type { ConsoleLogger, Loggable } from '@/types/Loggable';

import type { SecurityContext } from './SecurityContext';

export type Merge<T, U> = Omit<T, keyof U> & U;

export type InferEvent<EventSchema extends z.ZodType> = Merge<
  APIGatewayProxyEvent,
  z.output<EventSchema>
>;

export type HandlerReturn<ResponseSchema extends z.ZodType | undefined> =
  ResponseSchema extends z.ZodType
    ? Promise<z.output<ResponseSchema>>
    : Promise<unknown>;

/**
 * Handler options: typed env is an exact Pick over a key-union.
 */
export type HandlerOptions<
  Keys extends keyof AllParams,
  Logger extends ConsoleLogger,
> = {
  env: Pick<AllParams, Keys>;
  securityContext: SecurityContext;
} & Required<Pick<Loggable<Logger>, 'logger'>>;

/**
 * Handler signature: Keys is the union of env keys this handler receives.
 */
export type Handler<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Keys extends keyof AllParams,
  Logger extends ConsoleLogger,
> = (
  event: InferEvent<EventSchema>,
  context: Context,
  options: HandlerOptions<Keys, Logger>,
) => HandlerReturn<ResponseSchema>;
