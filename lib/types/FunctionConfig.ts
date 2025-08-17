/**
 * REQUIREMENTS ADDRESSED
 * - Carry GlobalParams & StageParams so fnEnvKeys is a precise union.
 * - Add EventType to gate HTTP-only keys at compile time.
 * - Keep authoring ergonomic (no casts), schemas optional.
 */

import type { AWS } from '@serverless/typescript';
import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';
import type { z } from 'zod';
import type { ZodOpenApiPathItemObject } from 'zod-openapi';

import type { HttpContext } from './HttpContext';

export type PropFromUnion<T, K extends PropertyKey> =
  T extends Record<K, infer V> ? V : never;

/** Union of supported HTTP Lambda event shapes. */
export type HttpEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2;

export type FunctionConfig<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  GlobalParams extends z.ZodType,
  StageParams extends z.ZodType,
  EventType,
> = {
  /** Unique function name within the Serverless service. */
  functionName: string;

  /**
   * Additional env-var keys required by this function.
   * When omitted, consumers treat as [].
   */
  fnEnvKeys?: readonly (
    | keyof z.output<GlobalParams>
    | keyof z.output<StageParams>
  )[];

  /** Optional Zod schemas (undefined disables validation for that phase). */
  eventSchema?: EventSchema;
  responseSchema?: ResponseSchema;

  /** Raw Serverless `functions[].events` (optional). */
  events?: PropFromUnion<AWS['functions'], 'events'>;
} & (EventType extends HttpEvent
  ? {
      /** HTTP-only facet (enabled by declaring an HTTP EventType). */
      httpContexts?: readonly HttpContext[];
      method?: keyof Omit<ZodOpenApiPathItemObject, 'id'>;
      basePath?: string;
      contentType?: string;
    }
  : {
      /** Non-HTTP functions: HTTP-only keys disallowed. */
      httpContexts?: never;
      method?: never;
      basePath?: never;
      contentType?: never;
    });
