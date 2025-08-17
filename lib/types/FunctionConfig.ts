import type { AWS } from '@serverless/typescript';
import type { z, ZodObject, ZodRawShape } from 'zod';
import type { ZodOpenApiPathItemObject } from 'zod-openapi';

import type { BaseEventTypeMap } from '@@/lib/types/BaseEventTypeMap';
import type { HttpContext } from '@@/lib/types/HttpContext';
import type { HTTP_EVENT_TOKENS } from '@@/lib/types/HttpEventTokens';
import type { ConsoleLogger } from '@@/lib/types/Loggable';

import type { PropFromUnion } from './PropFromUnion';

/** HTTP methods we support from zod-openapi's PathItem shape (exclude helper keys like 'id'). */
export type MethodKey = keyof Omit<ZodOpenApiPathItemObject, 'id'>;

/**
 * REQUIREMENTS ADDRESSED
 * - Capture per-function schemas/env keys and HTTP metadata, strongly typed.
 * - Gate HTTP-only options by whether EventType is one of the base HTTP tokens.
 * - Allow an optional logger injection that satisfies ConsoleLogger.
 */
export type FunctionConfig<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  GlobalParams extends ZodObject<ZodRawShape>,
  StageParams extends ZodObject<ZodRawShape>,
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

  /** Optional logger used by wrapper/middleware; must satisfy ConsoleLogger. */
  logger?: ConsoleLogger;
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
