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

  logger.debug('validating with zod', { value, schema });

  const result = schema.safeParse(value);

  if (result.success) logger.debug('zod validation succeeded', result);
  else logger.error('zod validation failed', result);

  return result.error?.message;
};

export type HttpZodValidatorOptions<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
> = {
  eventSchema?: EventSchema;
  responseSchema?: ResponseSchema;
} & Loggable<Logger>;

export const httpZodValidator = <
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
>(
  options: HttpZodValidatorOptions<EventSchema, ResponseSchema, Logger> = {},
): MiddlewareObj => {
  const {
    eventSchema,
    responseSchema,
    logger = console as unknown as Logger,
  } = options;

  return {
    before: (request) => {
      const errorMsg = validate(request.event, eventSchema, logger);
      if (errorMsg)
        throw createHttpError.BadRequest(`invalid event: ${errorMsg}`);
    },
    after: (request) => {
      const errorMsg = validate(request.response, responseSchema, logger);
      if (errorMsg)
        throw createHttpError.InternalServerError(
          `invalid response: ${errorMsg}`,
        );
    },
  };
};
