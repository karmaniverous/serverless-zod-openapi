import type { MiddlewareObj } from '@middy/core';
import type { z } from 'zod';

import { pojofy } from '@@/lib/pojofy';
import type { ConsoleLogger, Loggable } from '@@/lib/types/Loggable';

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
  } else {
    logger.error('zod validation failed', pojofy(result));
    throw result.error; // throw raw ZodError
  }
};

export type HttpZodValidatorOptions<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
> = {
  eventSchema?: EventSchema | undefined;
  responseSchema?: ResponseSchema | undefined;
} & Partial<Loggable<Logger>>;

export const httpZodValidator = <
  EventSchema extends z.ZodType | undefined,
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
    const res = request.response as { body?: unknown } | undefined;
    assertWithZod(res?.body, responseSchema, logger);
  },
  onError: (request) => {
    const res = (request.error ??
      (request as { response?: unknown }).response) as
      | { body?: unknown }
      | undefined;
    assertWithZod(res?.body, responseSchema, logger);
  },
});
