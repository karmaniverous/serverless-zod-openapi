import type { AWS } from '@serverless/typescript';
import type { z } from 'zod';
import type { ZodOpenApiPathItemObject } from 'zod-openapi';

import type { BaseEventTypeMap } from '@@/lib/types/BaseEventTypeMap';
import type { HttpContext } from '@@/lib/types/HttpContext';
import type { HTTP_EVENT_TOKENS } from '@@/lib/types/HttpEventTokens';

import type { PropFromUnion } from './PropFromUnion';

/** HTTP methods we support from zod-openapi's PathItem shape. */
export type MethodKey = keyof ZodOpenApiPathItemObject;

/**
 * FunctionConfig
 * - Captures per-function schemas, environment requirements, and routing metadata.
 * - EventTypeMap binds event tokens (e.g., 'rest', 'http', 'sqs') to their runtime shapes.
 * - EventType is a key in EventTypeMap; it selects the runtime event shape.
 *
 * HTTP-only options are permitted only when EventType is one of the base HTTP tokens.
 */
export type FunctionConfig<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  GlobalParams extends Record<string, unknown>,
  StageParams extends Record<string, unknown>,
  EventTypeMap extends BaseEventTypeMap,
  EventType extends keyof EventTypeMap,
> = {
  /** Unique function name; used across serverless/OpenAPI outputs. */
  functionName: string;

  /** Compile-time token selecting the runtime event type (e.g., 'rest' | 'http' | 'sqs'). */
  eventType: EventType;

  /** Optional; defaults to [] wherever consumed. */
  fnEnvKeys?: readonly (keyof GlobalParams | keyof StageParams)[];

  /** Optional Zod schemas applied uniformly across all handlers. */
  eventSchema?: EventSchema;
  responseSchema?: ResponseSchema;

  /** Optional extra serverless events (e.g., SQS triggers). */
  events?: PropFromUnion<AWS['functions'], string>['events'];
} &
  // Gate HTTP-only options by whether EventType is one of the base HTTP tokens.
  (EventType extends (typeof HTTP_EVENT_TOKENS)[number]
    ? {
        /** HTTP-only options (permitted for base HTTP tokens). */
        httpContexts?: readonly HttpContext[];
        method?: MethodKey;
        basePath?: string;
        contentType?: string;
      }
    : {
        /** Non-HTTP: deny HTTP-only options via type system. */
        httpContexts?: never;
        method?: never;
        basePath?: never;
        contentType?: never;
      });
