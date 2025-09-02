import type { z } from 'zod';

import type { ZodObj } from '@/src/app/types';
import type { EnvAttached } from '@/src/handler/defineFunctionConfig';
import type { AppHttpConfig } from '@/src/handler/middleware/httpStackCustomization';
import { wrapHandler } from '@/src/handler/wrapHandler';
import type { BaseEventTypeMap } from '@/src/types/BaseEventTypeMap';
import type { FunctionConfig } from '@/src/types/FunctionConfig';
import type { Handler } from '@/src/types/Handler';
/**
+ handlerFactory
 * - Produces a function that builds a wrapped handler with runtime HTTP tokens.
 * - Fully typed; no any; no dynamic import() types.
 *
 * @param httpEventTypeTokens - runtime widening of HTTP event tokens
 * @returns a function that binds a branded FunctionConfig and a business handler, producing a Lambda handler
 */
export const handlerFactory = <
  GlobalParamsSchema extends ZodObj,  StageParamsSchema extends ZodObj,
  EventTypeMapResolved extends BaseEventTypeMap,
  EventType extends keyof EventTypeMapResolved,
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
>(
  httpEventTypeTokens: readonly string[],
  httpConfig: AppHttpConfig,
) => {
  return (
    functionConfig: FunctionConfig<
      EventSchema,
      ResponseSchema,
      z.infer<GlobalParamsSchema>,
      z.infer<StageParamsSchema>,
      EventTypeMapResolved,
      EventType
    > &
      EnvAttached<GlobalParamsSchema, StageParamsSchema>,
    business: Handler<EventSchema, ResponseSchema, EventTypeMapResolved[EventType]>,
  ) =>
    wrapHandler(functionConfig, business, {
      httpEventTypeTokens,
      httpConfig,
    });
};