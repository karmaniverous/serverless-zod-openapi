import type { MiddlewareObj } from '@middy/core';
import createHttpError from 'http-errors';
import type { z } from 'zod';

import type { ConsoleLogger, Loggable } from '@/types/Loggable';

const validate = (
  value: unknown,
  schema: z.ZodType | undefined,
  logger: ConsoleLogger,
): string | undefined => {
  if (!schema) return;
  const result = schema.safeParse(value);
  if (result.success) logger.debug('zod validation succeeded', result);
  else logger.error('zod validation failed', result);
  return result.error?.message;
};

export interface HttpZodValidatorOptions<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
> {
  eventSchema?: EventSchema;
  responseSchema?: ResponseSchema;
}

export const httpZodValidator = <
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
>(
  opts: HttpZodValidatorOptions<EventSchema, ResponseSchema> &
    Loggable<Logger> = {},
): MiddlewareObj => {
  const {
    eventSchema,
    responseSchema,
    logger = console as unknown as Logger,
  } = opts;

  return {
    before: (request) => {
      const err = validate(request.event, eventSchema, logger);
      if (err) throw createHttpError.BadRequest(`invalid event: ${err}`);
    },
    after: (request) => {
      const err = validate(request.response, responseSchema, logger);
      if (err)
        throw createHttpError.InternalServerError(`invalid response: ${err}`);
    },
  };
};
