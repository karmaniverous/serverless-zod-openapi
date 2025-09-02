/**
 * REQUIREMENTS ADDRESSED
 * - Define which base event tokens are HTTP (in lib, not src).
 * - Provide a type guard usable by runtime to detect HTTP handlers.
 * - Only base event types are treated as HTTP; local maps can extend freely.
 */
import type { BaseEventTypeMap } from '@/src/types/BaseEventTypeMap';

/** Base tokens that are treated as HTTP by the runtime. */
/**
 * Default HTTP event tokens for SMOZ.
 *
 * @remarks
 * You can widen this set at runtime via `App.create({ httpEventTypeTokens })`.
 */
export const HTTP_EVENT_TOKENS = [
  'rest',
  'http',
] as const satisfies readonly (keyof BaseEventTypeMap)[];

/** Narrow helper used by wrappers to decide whether to apply HTTP middleware. */
/**
 * Type guard for default HTTP tokens.
 *
 * @param token - event type token
 * @returns true if the token is one of the default HTTP tokens
 */
export const isHttpEventTypeToken = (
  token: keyof BaseEventTypeMap,
): token is (typeof HTTP_EVENT_TOKENS)[number] => {  return (HTTP_EVENT_TOKENS as readonly string[]).includes(token);
};
