import type { MiddlewareObj } from '@middy/core';
import createHttpError from 'http-errors';
import type { z } from 'zod';

import type { ConsoleLogger, Loggable } from '@/types/Loggable';

/**
 * Validates a value against a Zod schema.
 *
 * @param value The value to validate.
 * @param schema The Zod schema to validate against.
 * @param logger The logger to use.
 * @returns An error message if validation fails, otherwise `undefined`.
 */
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

/**
 * The options for the `httpZodValidator` middleware.
 *
 * @template EventSchema The Zod schema for the event.
 * @template ResponseSchema The Zod schema for the response.
 * @template Logger The type of the logger.
 */
export type HttpZodValidatorOptions<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
> = {
  /**
   * The Zod schema for the event.
   */
  eventSchema?: EventSchema;
  /**
   * The Zod schema for the response.
   */
  responseSchema?: ResponseSchema;
} & Loggable<Logger>;

/**
 * A Middy middleware that validates the event and response against Zod schemas.
 *
 * @param options The options for the middleware.
 * @returns The Middy middleware object.
 */
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