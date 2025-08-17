import middy from '@middy/core';
import type { Context } from 'aws-lambda';
import type { z } from 'zod';

import {
  buildEnvSchema,
  deriveAllKeys,
  parseTypedEnv,
  splitKeysBySchema,
} from '@@/lib/handler/envBuilder';
import { buildHttpMiddlewareStack } from '@@/lib/handler/middleware/buildHttpMiddlewareStack';
import type { BaseEventTypeMap } from '@@/lib/types/BaseEventTypeMap';
import type { FunctionConfig } from '@@/lib/types/FunctionConfig';
import type { Handler, ShapedEvent } from '@@/lib/types/Handler';
import { isHttpEventTypeToken } from '@@/lib/types/HttpEventTokens';
import type { ConsoleLogger } from '@@/lib/types/Loggable';
import { globalEnvKeys, globalParamsSchema } from '@@/src/config/global';
import { stageEnvKeys, stageParamsSchema } from '@@/src/config/stage';

/**
 * Cross-cutting rules: see /requirements.md (logging, HEAD semantics, env composition).
 */
type Z = z.ZodType;

export const makeWrapHandler = <
  EventSchema extends Z | undefined,
  ResponseSchema extends Z | undefined,
  EventTypeMap extends BaseEventTypeMap,
  EventType extends keyof EventTypeMap,
>(
  functionConfig: FunctionConfig<
    EventSchema,
    ResponseSchema,
    Record<string, unknown>,
    Record<string, unknown>,
    EventTypeMap,
    EventType
  >,
  business: Handler<EventSchema, ResponseSchema>,
) => {
  const base = async (event: unknown, context: Context) => {
    const { eventSchema, responseSchema } = functionConfig;

    // --- Build typed env from project schemas & config -----------------------
    const normalizedFnEnvKeys = (functionConfig.fnEnvKeys ?? []).map((k) =>
      String(k),
    ) as readonly string[];

    const allKeys = deriveAllKeys(
      globalEnvKeys as unknown as readonly string[],
      stageEnvKeys as unknown as readonly string[],
      normalizedFnEnvKeys,
    );

    const { globalPick, stagePick } = splitKeysBySchema(
      allKeys,
      globalParamsSchema,
      stageParamsSchema,
    );

    const envSchema = buildEnvSchema(
      globalPick,
      stagePick,
      globalParamsSchema,
      stageParamsSchema,
    );

    const env = parseTypedEnv(envSchema, process.env);

    const logger: ConsoleLogger =
      (functionConfig.logger) ?? console;

    // --- Validate incoming event (Zod) --------------------------------------
    if (eventSchema) {
      const result = eventSchema.safeParse(event);
      if (!result.success) {
        const e = new Error('Invalid input') as Error & {
          expose: boolean;
          statusCode: number;
          issues: unknown[];
        };
        if (
          isHttpEventTypeToken(
            functionConfig.eventType as keyof BaseEventTypeMap,
          )
        ) {
          e.expose = true;
          e.statusCode = 400;
        }
        e.issues = result.error.issues;
        throw e;
      }
    }

    const out = await business(
      event as ShapedEvent<EventSchema, EventTypeMap[EventType]>,
      context,
      { env, logger },
    );

    // --- Validate business response (Zod) -----------------------------------
    if (responseSchema) {
      const result = responseSchema.safeParse(out as unknown);
      if (!result.success) {
        const e = new Error('Invalid response') as Error & {
          expose: boolean;
          statusCode: number;
          issues?: unknown[];
        };
        if (
          isHttpEventTypeToken(
            functionConfig.eventType as keyof BaseEventTypeMap,
          )
        ) {
          e.expose = true;
          e.statusCode = 500;
        }
        e.issues = result.error.issues;
        throw e;
      }
    }

    return out;
  };

  // HTTP: wrap in middy + http stack.
  if (
    isHttpEventTypeToken(functionConfig.eventType as keyof BaseEventTypeMap)
  ) {
    const http = buildHttpMiddlewareStack({
      eventSchema: functionConfig.eventSchema,
      responseSchema: functionConfig.responseSchema,
      contentType:
        (functionConfig as { contentType?: string }).contentType ??
        'application/json',
      logger: (functionConfig.logger) ?? console,
    });

    const wrapped = middy(async (e, c) => base(e, c)).use(http);
    return wrapped as unknown as (e: unknown, c: Context) => Promise<unknown>;
  }

  // Non‑HTTP: no middy, no shaping.
  return base;
};
