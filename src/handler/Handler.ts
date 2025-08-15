// src/handler/Handler.ts
import type { Context } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger, Loggable } from '@/src/types/Loggable';
import type { SecurityContext } from '@/src/types/SecurityContext';
import type { ShapedEvent } from '@/src/types/ShapedEvent';
import type { ShapedResponse } from '@/src/types/ShapedResponse';

export type HandlerOptions<
  AllParams extends Record<string, unknown>,
  EnvKeys extends keyof AllParams,
  Logger extends ConsoleLogger,
> = {
  env: Pick<AllParams, EnvKeys>;
  securityContext: SecurityContext;
} & Loggable<Logger>;

/**
 * Handler signature: EnvKeys is the union of env keys this handler receives.
 */
export type Handler<
  EventSchema extends z.ZodType,
  ResponseSchema extends z.ZodType | undefined,
  AllParams extends Record<string, unknown>,
  EnvKeys extends keyof AllParams,
  Logger extends ConsoleLogger,
> = (
  event: ShapedEvent<EventSchema>,
  context: Context,
  options: HandlerOptions<AllParams, EnvKeys, Logger>,
) => ShapedResponse<ResponseSchema>;
