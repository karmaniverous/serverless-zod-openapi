import type { AWS } from '@serverless/typescript';
import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';
import type { z } from 'zod';
import type { ZodOpenApiPathItemObject } from 'zod-openapi';

import type { HttpContext } from '@@/lib/types/HttpContext';

import type { PropFromUnion } from './PropFromUnion';

export type HttpEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2;

export type MethodKey = keyof ZodOpenApiPathItemObject;

export type FunctionConfig<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  GlobalParams extends Record<string, unknown>,
  StageParams extends Record<string, unknown>,
  EventType = never,
> = {
  /** Unique function name; used across serverless/OpenAPI outputs. */
  functionName: string;

  /** Optional; defaults to [] wherever consumed. */
  fnEnvKeys?: readonly (keyof GlobalParams | keyof StageParams)[];

  /** Optional Zod schemas applied uniformly across all handlers. */
  eventSchema?: EventSchema;
  responseSchema?: ResponseSchema;

  /** Optional extra serverless events (e.g., SQS triggers). */
  events?: PropFromUnion<AWS['functions'], string>['events'];
} & (EventType extends HttpEvent
  ? {
      /** HTTP-only options (permitted when EventType is an HttpEvent). */
      httpContexts?: readonly HttpContext[];
      method?: MethodKey;
      basePath?: string;
      contentType?: string;
    }
  : {
      /** Internal-only: deny HTTP-only options via type system. */
      httpContexts?: never;
      method?: never;
      basePath?: never;
      contentType?: never;
    });
