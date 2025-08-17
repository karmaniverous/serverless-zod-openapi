/**
 * REQUIREMENTS ADDRESSED
 * - Keep this helper a strict pass-through with explicit EventType generic.
 * - Do not add defaults or shaping here.
 */

import type { z } from 'zod';

import type { FunctionConfig } from '@@/lib/types/FunctionConfig';

export const makeFunctionConfig = <
  EventType,
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  GlobalParams extends z.ZodType,
  StageParams extends z.ZodType,
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
