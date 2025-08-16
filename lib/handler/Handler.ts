import type { Context } from 'aws-lambda';
import type { z } from 'zod';

import type { HttpContext } from '@@/lib/types/HttpContext';
import type { ConsoleLogger } from '@@/lib/types/Loggable';
import type { ShapedEvent } from '@@/lib/types/ShapedEvent';
import type { ShapedResponse } from '@@/lib/types/ShapedResponse';

/** Non-generic options shape for handlers (kept simple for tests). */
export type HandlerOptions = {
  env: Record<string, unknown>;
  logger: ConsoleLogger;
  /** Present only when invoked via HTTP; omitted for SQS/Step/etc. */
  securityContext?: HttpContext;
};

/** Business handler signature used by wrapHandler (2 generics to match tests). */
export type Handler<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
> = (
  event: ShapedEvent<EventSchema>,
  context: Context,
  options: HandlerOptions,
) => ShapedResponse<ResponseSchema>;

/** Wrapped Lambda signature (response schema drives serializer). */
export type WrappedHandler<ResponseSchema extends z.ZodType | undefined> = (
  event: unknown,
  context: Context,
) => Promise<ShapedResponse<ResponseSchema>>;
