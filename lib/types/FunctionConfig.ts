import type { AWS } from '@serverless/typescript';
import type { z, ZodObject, ZodRawShape } from 'zod';
import type { ZodOpenApiPathItemObject } from 'zod-openapi';

import type { BaseEventTypeMap } from '@@/lib/types/BaseEventTypeMap';
import type { HttpContext } from '@@/lib/types/HttpContext';
import type { ConsoleLogger } from '@@/lib/types/Loggable';

import type { PropFromUnion } from './PropFromUnion';

/** HTTP methods supported from zod-openapi's PathItem shape (excluding helper 'id'). */
export type MethodKey = keyof Omit<ZodOpenApiPathItemObject, 'id'>;

/**
 * FunctionConfig
 * - Per-function schemas, env requirements, routing metadata.
 * - EventTypeMap binds event tokens (e.g., 'rest'|'http'|'sqs') to runtime shapes.
 * - HTTP-only options are permitted only when EventType is an HTTP token.
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

  /** Optional logger; wrapper will default to `console`. */
  logger?: ConsoleLogger;
} & (EventType extends keyof Pick<BaseEventTypeMap, 'rest' | 'http'>
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
