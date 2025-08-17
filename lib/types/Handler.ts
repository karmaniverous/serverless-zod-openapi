import type { Context } from 'aws-lambda';
import type { z } from 'zod';

import type { DeepOverride } from '@@/lib/types/DeepOverride';
import type { ConsoleLogger } from '@@/lib/types/Loggable';

/**
 * REQUIREMENTS ADDRESSED
 * - Event shaping respects any provided Zod event schema.
 * - HandlerOptions.logger MUST extend ConsoleLogger everywhere (global contract).
 * - Keep business handlers free of HTTP shaping; wrappers handle that.
 */

export type ShapedEvent<
  EventSchema extends z.ZodType | undefined,
  EventType,
> = EventSchema extends z.ZodType
  ? DeepOverride<EventType, z.infer<EventSchema>>
  : EventType;

/** Handler options shared across invocation modes. */
export type HandlerOptions = {
  /** Fully-typed env constructed by the wrapper. */
  env: Record<string, unknown>;
  /** Optional security context for HTTP calls. */
  securityContext?: unknown;
  /** Logger MUST satisfy ConsoleLogger across the codebase. */
  logger: ConsoleLogger;
};

/** Business handler: returns raw payloads; wrapping layers handle HTTP shaping when applicable. */
export type Handler<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  EventType,
> = (
  event: ShapedEvent<EventSchema, EventType>,
  context: Context,
  options: HandlerOptions,
) => Promise<
  ResponseSchema extends z.ZodType ? z.infer<ResponseSchema> : unknown
>;
