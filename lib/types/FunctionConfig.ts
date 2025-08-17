/**
 * REQUIREMENTS ADDRESSED
 * - Carry GlobalParams & StageParams so fnEnvKeys is typed as a precise union.
 * - Add EventType as a type parameter to gate HTTP-only config keys.
 * - Keep authoring ergonomic; no casts required in config modules.
 */

import type { AWS } from '@serverless/typescript';
import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';
import type { z } from 'zod';
import type { ZodOpenApiPathItemObject } from 'zod-openapi';

import type { HttpContext } from './HttpContext';

export type PropFromUnion<T, K extends PropertyKey> =
  T extends Record<K, infer V> ? V : never;

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
   * Optional list of additional env var keys required by this function.
   * Consumers treat `undefined` as [].
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
      /** HTTP-only facet (enabled by declaring an HTTP EventType) */
      httpContexts?: readonly HttpContext[];
      method?: keyof Omit<ZodOpenApiPathItemObject, 'id'>;
      basePath?: string;
      contentType?: string;
    }
  : {
      /** For non-HTTP event types, HTTP-only keys are disallowed */
      httpContexts?: never;
      method?: never;
      basePath?: never;
      contentType?: never;
    });
