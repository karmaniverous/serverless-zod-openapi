/* REQUIREMENTS ADDRESSED
- Provide stable types shared across the handler system.
- Distinguish business result (`HandlerResult`) from HTTP-wrapped response (`WrappedHttpResponse`).
- Ensure `Handler` returns a business payload (not HTTP envelope); `WrappedHandler` returns an HTTP envelope.
*/
import type { Context } from 'aws-lambda';
import type { z } from 'zod';

import type { HttpContext } from '@@/lib/types/HttpContext';
import type { ConsoleLogger } from '@@/lib/types/Loggable';
import type { ShapedEvent } from '@@/lib/types/ShapedEvent';

/** Non-generic options shape for handlers (kept simple for tests). */
export type HandlerOptions = {
  env: Record<string, unknown>;
  logger: ConsoleLogger;
  /** Present only when invoked via HTTP; omitted for SQS/Step/etc. */
  securityContext?: HttpContext;
};

export type HandlerResult<ResponseSchema extends z.ZodType | undefined> =
  ResponseSchema extends z.ZodType
    ? z.output<ResponseSchema>
    : Record<string, never>;

export type Handler<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
> = (
  event: ShapedEvent<EventSchema>,
  context: Context,
  options: HandlerOptions,
) => Promise<HandlerResult<ResponseSchema>>;

/** HTTP-shaped response returned by wrapped handlers. */
export type WrappedHttpResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

/** Wrapped Lambda signature returning HTTP envelope. */
export type WrappedHandler<ResponseSchema extends z.ZodType | undefined> = (
  event: unknown,
  context: Context,
) => Promise<WrappedHttpResponse>;
