import type { z } from 'zod';

import type { FunctionConfig } from '@/src/types/FunctionConfig';
import type { EventTypeMap as LocalEventTypeMap } from '@/stack/config/EventTypeMap';
/**
 * Passthrough that *enforces* an explicit EventType for gating HTTP-only options
 * and binds the project's local EventTypeMap without requiring generics at call sites.
 * EventSchema/ResponseSchema are inferred from the `functionConfig` argument.
 */
export const makeFunctionConfig = <
  EventType extends keyof LocalEventTypeMap,
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  GlobalParams extends Record<string, unknown>,
  StageParams extends Record<string, unknown>,
>(
  functionConfig: FunctionConfig<
    EventSchema,
    ResponseSchema,
    GlobalParams,
    StageParams,
    LocalEventTypeMap,
    EventType
  >,
): FunctionConfig<
  EventSchema,
  ResponseSchema,
  GlobalParams,
  StageParams,
  LocalEventTypeMap,
  EventType
> => functionConfig;
