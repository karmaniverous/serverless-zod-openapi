/**
 * REQUIREMENTS ADDRESSED
 * - Single up-to-date Handler type: event param = DeepOverride<EventType, z.infer<eventSchema>>.
 * - Options carry env + logger (+securityContext only for HTTP).
 * - No back-compat types; no 'any'.
 */

import type { Context } from 'aws-lambda';
import type { z } from 'zod';

import type { DeepOverride } from '@@/lib/types/DeepOverride';
import type { ConsoleLogger } from '@@/lib/types/Loggable';
import type { ShapedResponse } from '@@/lib/types/ShapedResponse';

export type HandlerOptions = {
  env: Record<string, unknown>;
  logger: ConsoleLogger;
  /** Present only when the event is HTTP (populated by the wrapper). */
  securityContext?: unknown;
};

export type EventParam<
  EventType,
  EventSchema extends z.ZodType | undefined,
> = EventSchema extends z.ZodType
  ? DeepOverride<EventType, z.infer<EventSchema>>
  : EventType;

export type Handler<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  EventType,
> = (
  event: EventParam<EventType, EventSchema>,
  context: Context,
  options: HandlerOptions,
) => ShapedResponse<ResponseSchema>;
