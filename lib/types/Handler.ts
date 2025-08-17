import type { Context } from 'aws-lambda';
import type { z } from 'zod';

import type { DeepOverride } from '@@/lib/types/DeepOverride';
import type { ConsoleLogger } from '@@/lib/types/Loggable';

/**
 * File-specific: handler/event shaping types.
 * Cross-cutting rules: see /requirements.md (logging contract, typing guidelines).
 */

/** Event type after applying deep schema overrides.
 *  IMPORTANT: use z.input<Schema> so pre‑transform input shape is preserved for typing. */
export type ShapedEvent<
  EventSchema extends z.ZodType | undefined,
  EventType,
> = EventSchema extends z.ZodType
  ? DeepOverride<EventType, z.input<EventSchema>>
  : EventType;

/** Handler options passed by wrappers (HTTP or non-HTTP). */
export type HandlerOptions = {
  env: Record<string, unknown>;
  /** Must satisfy ConsoleLogger (see /requirements.md §1). */
  logger: ConsoleLogger;
};

/** Business handler:
 *  - Returns raw payloads; wrappers handle HTTP shaping when applicable.
 *  - Function-level generic <EventType> allows wrappers to provide the concrete runtime shape. */
export type Handler<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
> = <EventType>(
  event: ShapedEvent<EventSchema, EventType>,
  context: Context,
  options: HandlerOptions,
) => Promise<
  ResponseSchema extends z.ZodType ? z.infer<ResponseSchema> : unknown
>;
