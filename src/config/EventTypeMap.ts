import type { BaseEventTypeMap } from '@@/lib/types/BaseEventTypeMap';

export interface EventTypeMap extends BaseEventTypeMap {
  step: Record<string, unknown>;
}
