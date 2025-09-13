import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import { combine } from '@/src/http/middleware/combine';
import type { ConsoleLogger } from '@/src/types/Loggable';

import {
  makeContentNegotiation,
  makeCors,
  makeErrorExposure,
  makeErrorHandler,
  makeEventNormalizer,
  makeHead,
  makeHeaderNormalizer,
  makeHeadFinalize,
  makeJsonBodyParser,
  makePreferredMedia,
  makeResponseSerializer,
  makeShapeAndContentType,
  makeZodValidator,
} from './steps';

export type BuildHttpMiddlewareStackOptions<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
> = {
  eventSchema?: EventSchema;
  responseSchema?: ResponseSchema;
  /** default: 'application/json' */
  contentType?: string;
  /** optional logger (Console-compatible); defaults to console */
  logger?: ConsoleLogger;
};

export const buildHttpMiddlewareStack = <
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
>(
  options: BuildHttpMiddlewareStackOptions<EventSchema, ResponseSchema>,
): MiddlewareObj<APIGatewayProxyEvent, Context> => {
  const contentType = (options.contentType ?? 'application/json').toLowerCase();
  const logger: ConsoleLogger = options.logger ?? console;

  const before = [
    makeHead(),
    makeHeaderNormalizer(),
    makeEventNormalizer(),
    makeContentNegotiation(contentType),
    makeJsonBodyParser(),
    makeZodValidator(logger, options.eventSchema, undefined),
  ];
  const after = [
    makeHeadFinalize(contentType),
    makeZodValidator(logger, undefined, options.responseSchema),
    makeErrorExposure(logger),
    makeCors(),
    makePreferredMedia(contentType),
    makeShapeAndContentType(contentType),
    makeResponseSerializer(contentType, logger),
  ];
  const onError = [makeErrorExposure(logger), makeErrorHandler(logger)];

  return combine(...before, ...after, ...onError);
};
