import type { MiddlewareObj } from '@middy/core';
import type { z } from 'zod';

import { pojofy } from '@@/src/pojofy';
import type { ConsoleLogger, Loggable } from '@@/src/types/Loggable';

const assertWithZod = (
  value: unknown,
  schema: z.ZodType | undefined,
  logger: ConsoleLogger,
): void => {
  if (!schema) return;
  logger.debug('validating with zod', value);
  const result = schema.safeParse(value);
  if (result.success) {
    logger.debug('zod validation succeeded', pojofy(result));
    return;
  }
  logger.error('zod validation failed', pojofy(result));
  throw result.error; // throw raw ZodError
};

export type HttpZodValidatorOptions<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
> = {
  eventSchema?: EventSchema | undefined;
  responseSchema?: ResponseSchema | undefined;
} & Partial<Loggable<Logger>>;

export const httpZodValidator = <
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
>({
  eventSchema,
  responseSchema,
  logger = console as unknown as Logger,
}: HttpZodValidatorOptions<
  EventSchema,
  ResponseSchema,
  Logger
> = {}): MiddlewareObj => ({
  before: (request) => {
    assertWithZod(request.event, eventSchema, logger);
  },
  after: (request) => {
    const res = request.response as unknown;

    // Skip if the handler already returned a shaped HTTP response...
    const looksShaped =
      typeof res === 'object' &&
      res !== null &&
      'statusCode' in (res as Record<string, unknown>) &&
      'headers' in (res as Record<string, unknown>) &&
      'body' in (res as Record<string, unknown>);

    // ...or a raw string (serializer will pass it through).
    if (looksShaped || typeof res === 'string') return;

    assertWithZod(res, responseSchema, logger);
  },
});
