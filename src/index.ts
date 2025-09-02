/**
 * SMOZ — Serverless + Middy + OpenAPI + Zod
 *
 * Public entry point for the toolkit. Import from 'smoz' in application code.
 *
 * Exposes:
 * - App orchestrator (schema‑first) to register functions and aggregate
 *   Serverless + OpenAPI artifacts.
 * - HTTP runtime wrapper and middleware building blocks.
 * - Helpers and commonly used types.
 *
 * @packageDocumentation
 */

/**
 * Public entry point for the toolkit. Stack code must import only from '@/src'.
 * Exposes runtime wrappers, middleware, builders, and commonly used types.
 */
export { App } from './config/App';
/** Base event map schema (rest/http/sqs). Extend it in your App. */
export { baseEventTypeMapSchema } from './config/baseEventTypeMapSchema';
export type {
  DefineAppConfigInput,  DefineAppConfigOutput,
  EnvKeysNode,
  EnvSchemaNode,
  GlobalEnvConfig,
  GlobalParamsNode,
  StageParamsNode,
} from './config/defineAppConfig';
export { defineAppConfig } from './config/defineAppConfig';
/** Detects 'my' | 'private' | 'public' from an API Gateway event. */
export { detectSecurityContext } from './handler/detectSecurityContext';
/** Convert a set of middlewares to API‑Gateway‑typed form. */
export { asApiMiddleware } from './handler/middleware/asApiMiddleware';
/** Build the standard HTTP middleware stack. */
export { buildHttpMiddlewareStack } from './handler/middleware/buildHttpMiddlewareStack';
/** Compose multiple middlewares into one. */
export { combine } from './handler/middleware/combine';
/** Zod validator middleware (event/response). */
export { httpZodValidator } from './handler/middleware/httpZodValidator';
/** HEAD short‑circuit middleware (200 {}). */
export { shortCircuitHead } from './handler/middleware/shortCircuitHead';
/** Wrap a business handler with SMOZ runtime (HTTP or non‑HTTP). */
export { wrapHandler } from './handler/wrapHandler';

// Types
export type { BaseEventTypeMap } from './types/BaseEventTypeMap';
export type { FunctionConfig } from './types/FunctionConfig';
export type { Handler } from './types/Handler';
export type { HttpContext } from './types/HttpContext';
export type { LambdaEvent } from './types/LambdaEvent';
export type { ConsoleLogger } from './types/Loggable';
export type { SecurityContextHttpEventMap } from './types/SecurityContextHttpEventMap';

// Optional helper exports
export {
  buildEnvSchema,
  deriveAllKeys,
  parseTypedEnv,
  splitKeysBySchema,
} from './handler/envBuilder';
export { stagesFactory } from './serverless/stagesFactory';