import type { z } from 'zod';

import type { FunctionConfig } from '@@/lib/types/FunctionConfig';

/**
 * Passthrough that *enforces* an explicit EventType for gating HTTP-only options.
 * EventSchema/ResponseSchema are inferred from the `functionConfig` argument.
 */
export const makeFunctionConfig = <
  EventType = never,
  EventSchema extends z.ZodType | undefined = undefined,
  ResponseSchema extends z.ZodType | undefined = undefined,
  GlobalParams extends Record<string, unknown> = Record<string, never>,
  StageParams extends Record<string, unknown> = Record<string, never>,
>(
  functionConfig: FunctionConfig<
    EventSchema,
    ResponseSchema,
    GlobalParams,
    StageParams,
    EventType
  >,
): FunctionConfig<
  EventSchema,
  ResponseSchema,
  GlobalParams,
  StageParams,
  EventType
> => functionConfig;
