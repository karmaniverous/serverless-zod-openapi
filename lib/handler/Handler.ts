/**
 * REQUIREMENTS ADDRESSED
 * - Keep existing Handler<E, R> for tests/back-compat.
 * - Provide TypedHandler<E, R, EventType> whose `event` param is the deep-override
 *   of EventType with z.infer<E>.
 * - Avoid 'any'; keep naming and imports consistent.
 */

import type { Context } from 'aws-lambda';
import type { z } from 'zod';

import type { DeepOverride } from '@@/lib/types/DeepOverride';
import type { ConsoleLogger } from '@@/lib/types/Loggable';
import type { ShapedResponse } from '@@/lib/types/ShapedResponse';

export type HandlerOptions = {
  env: Record<string, unknown>;
  logger: ConsoleLogger;
  /** Present only for HTTP event types. */
  securityContext?: unknown;
};

export type EventParam<
  EventType,
  EventSchema extends z.ZodType | undefined,
> = EventSchema extends z.ZodType
  ? DeepOverride<EventType, z.infer<EventSchema>>
  : EventType;

export type TypedHandler<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  EventType,
> = (
  event: EventParam<EventType, EventSchema>,
  context: Context,
  options: HandlerOptions,
) => ShapedResponse<ResponseSchema>;

/**
 * Backward-compatible alias used by existing tests (no declared EventType).
 * The wrapper will still validate and pass the correct runtime event; typing here
 * remains generic.
 */
export type Handler<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
> = (
  event: unknown,
  context: Context,
  options: HandlerOptions,
) => ShapedResponse<ResponseSchema>;
