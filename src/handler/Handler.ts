import type { APIGatewayProxyEvent, Context, ProxyHandler } from 'aws-lambda';
import type { ZodObject } from 'zod';

import type { ConsoleLogger, Loggable } from '../Loggable';

export type Merge<T, U> = Omit<T, keyof U> & U;

export type Handler<
  EventSchema extends ZodObject,
  ResponseSchema extends ZodObject,
  Logger extends ConsoleLogger,
> = (
  event: Merge<APIGatewayProxyEvent, EventSchema>,
  context: Context,
  options: Loggable<Logger>,
) => Promise<Merge<ReturnType<ProxyHandler>, ResponseSchema>>;
