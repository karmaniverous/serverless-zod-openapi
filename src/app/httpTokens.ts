import type { BaseEventTypeMap } from '@/src/types/BaseEventTypeMap';

/** Default base tokens treated as HTTP by the runtime. */
export const defaultHttpEventTypeTokens = [
  'rest',
  'http',
] as const satisfies readonly (keyof BaseEventTypeMap)[];

/** Base event type keys that MUST be present in any extended map schema. */
const BASE_EVENT_TYPE_KEYS = ['rest', 'http', 'sqs'] as const;

/**
 * Runtime guard: ensure an extended eventTypeMapSchema includes base keys.
 * Pass the .shape object of a ZodObject for checking.
 */
export const validateEventTypeMapSchemaIncludesBase = (
  shape: Record<string, unknown>,
): void => {
  for (const k of BASE_EVENT_TYPE_KEYS) {
    if (!(k in shape)) throw new Error(`eventTypeMapSchema is missing base key "${k}". Ensure it extends baseEventTypeMapSchema.`);
  }
};
