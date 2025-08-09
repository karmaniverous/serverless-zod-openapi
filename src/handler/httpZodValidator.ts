import type { MiddlewareObj } from '@middy/core';
import createHttpError from 'http-errors';
import type { ZodObject } from 'zod';

import type { ConsoleLogger, Loggable } from '../Loggable';

const validate = <Logger extends ConsoleLogger>(
  value: unknown,
  schema?: ZodObject,
  logger: Logger = console as unknown as Logger,
) => {
  if (!schema) return;

  const result = schema.safeParse(value);

  if (result.success) logger.debug('zod validation succeeded', result);
  else logger.error('zod validation failed', result);

  return result.error?.message;
};

export interface HttpZodValidatorOptions<
  EventSchema extends ZodObject,
  ResponseSchema extends ZodObject,
> {
  eventSchema?: EventSchema | undefined;
  responseSchema?: ResponseSchema | undefined;
}

export const httpZodValidator = <
  EventSchema extends ZodObject,
  ResponseSchema extends ZodObject,
  Logger extends ConsoleLogger,
>({
  eventSchema,
  responseSchema,
  logger = console as unknown as Logger,
}: HttpZodValidatorOptions<EventSchema, ResponseSchema> &
  Loggable<Logger> = {}): MiddlewareObj => ({
  before: (request) => {
    const validationError = validate(request.event, eventSchema, logger);
    if (validationError)
      throw createHttpError.BadRequest(`invalid event: ${validationError}`);
  },
  after: (request) => {
    const validationError = validate(request.response, responseSchema, logger);
    if (validationError)
      throw createHttpError.InternalServerError(
        `invalid response: ${validationError}`,
      );
  },
});
