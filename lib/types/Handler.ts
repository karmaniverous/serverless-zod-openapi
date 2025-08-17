import type { Context } from 'aws-lambda';
import type { z } from 'zod';

import type { DeepOverride } from '@@/lib/types/DeepOverride';

/** REQUIREMENTS ADDRESSED
 * - Define a single business handler type used by wrappers and implementers.
 * - The event parameter is *shaped* by the provided Zod schema at the type level.
 * - Do not use defaulted type parameters (project guideline).
 * - Keep the handler’s third generic (runtime event shape) as a function‑level generic
 *   so call sites may keep `Handler<E, R>` while the wrapper supplies the concrete event type.
 */

/** Event type after applying deep schema overrides.
 *  IMPORTANT: use z.input<Schema> so pre‑transform shape is preserved for typing. */
export type ShapedEvent<
  EventSchema extends z.ZodType | undefined,
  EventType,
> = EventSchema extends z.ZodType
  ? DeepOverride<EventType, z.input<EventSchema>>
  : EventType;

/** Handler options shared across invocation modes. */
export type HandlerOptions = {
  env: Record<string, unknown>;
  logger: Pick<Console, 'debug' | 'error' | 'info' | 'log'>;
};

/** Business handler:
 *  - Returns raw payloads; wrapping layers handle HTTP shaping when applicable.
 *  - Generic on the *runtime* EventType at the function level so wrappers can provide it. */
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
