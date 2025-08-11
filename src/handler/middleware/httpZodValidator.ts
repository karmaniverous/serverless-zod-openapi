import type { MiddlewareObj } from '@middy/core';
import createHttpError from 'http-errors';
import type { z } from 'zod';

import type { ConsoleLogger, Loggable } from '@/types/Loggable';

/**
 * Validates a value against a Zod schema. Returns a compact error string when invalid.
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

export type HttpZodValidatorOptions<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
> = {
  eventSchema?: EventSchema | undefined;
  responseSchema?: ResponseSchema | undefined;
} & Loggable<Logger>;

/**
 * Middy middleware that validates the event and the *unshaped* response with Zod.
 * We deliberately throw 400 (BadRequest) for both invalid event *and* invalid response
 * so your API surface remains debuggable and consistent in local/dev environments.
 */
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
    const errorMsg = validate(request.event, eventSchema, logger);
    if (errorMsg)
      throw createHttpError.BadRequest(`invalid event: ${errorMsg}`);
  },
  after: (request) => {
    const errorMsg = validate(request.response, responseSchema, logger);
    if (errorMsg)
      throw createHttpError.BadRequest(`invalid response: ${errorMsg}`);
  },
});
