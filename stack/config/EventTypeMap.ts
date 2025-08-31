import type { BaseEventTypeMap } from '@@/src';

export interface EventTypeMap extends BaseEventTypeMap {
  step: Record<string, unknown>;
}
/** Tokens that should be treated as HTTP at runtime by the wrapper. */
export const HTTP_EVENT_TOKENS = ['rest'] as const;

/** Narrow helper used by the wrapper to decide whether to apply HTTP middleware. */
export const isHttpEventTypeToken = (
  token: keyof EventTypeMap,
): token is (typeof HTTP_EVENT_TOKENS)[number] => {
  return (HTTP_EVENT_TOKENS as readonly string[]).includes(token as string);
};
