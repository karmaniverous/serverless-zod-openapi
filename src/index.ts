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
export type { AppInit } from './core/App';
export { App } from './core/App';
/** Base event map schema (rest/http/sqs). Extend it in your App. */
export { baseEventTypeMapSchema } from './core/baseEventTypeMapSchema';
export type {
  DefineAppConfigInput,
  DefineAppConfigOutput,
  EnvKeysNode,
  EnvSchemaNode,
  GlobalEnvConfig,
  GlobalParamsNode,
  StageParamsNode,
} from './core/defineAppConfig';
export { defineAppConfig } from './core/defineAppConfig';
/** Detects 'my' | 'private' | 'public' from an API Gateway event. */
export { detectSecurityContext } from './runtime/detectSecurityContext';
/** Convert a set of middlewares to API‑Gateway‑typed form. */
export { asApiMiddleware } from './http/middleware/asApiMiddleware';
/** Build the standard HTTP middleware stack. */
export type { BuildHttpMiddlewareStackOptions } from './http/middleware/buildHttpMiddlewareStack';
export { buildHttpMiddlewareStack } from './http/middleware/buildHttpMiddlewareStack';
/** Compose multiple middlewares into one. */
export { combine } from './http/middleware/combine';
/** Zod validator middleware (event/response). */
export type { HttpZodValidatorOptions } from './http/middleware/httpZodValidator';
export { httpZodValidator } from './http/middleware/httpZodValidator';
/** HTTP customization (options/profiles/transform helpers). */
/** Wrap a business handler with SMOZ runtime (HTTP or non‑HTTP). */ export type { EnvAttached } from './core/defineFunctionConfig';
export type {
  AppHttpConfig,
  FunctionHttpConfig,
  HttpProfile,
  HttpStackOptions,
} from './http/middleware/httpStackCustomization';
export { buildSafeDefaults } from './http/middleware/httpStackCustomization';
export { shortCircuitHead } from './http/middleware/shortCircuitHead';
export {
  findIndex,
  getId,
  insertAfter,
  insertBefore,
  removeStep,
  replaceStep,
  tagStep,
} from './http/middleware/transformUtils'; /** HEAD short‑circuit middleware (200 {}). */
export { wrapHandler } from './runtime/wrapHandler';

// Types
export type { BaseEventTypeMap } from './types/BaseEventTypeMap';
export type { FunctionConfig } from './types/FunctionConfig';
export type { MethodKey } from './types/FunctionConfig';
export type { Handler } from './types/Handler';
export type { HandlerOptions, ShapedEvent } from './types/Handler';
export type { HttpContext } from './types/HttpContext';
export type { LambdaEvent } from './types/LambdaEvent';
export type { ConsoleLogger } from './types/Loggable';
export type { PropFromUnion } from './types/PropFromUnion';
export type { SecurityContextHttpEventMap } from './types/SecurityContextHttpEventMap';

// Optional helper exports
export type { ZodObj } from './core/types';
export type { BaseOperation } from './openapi/types';
export {
  buildEnvSchema,
  deriveAllKeys,
  parseTypedEnv,
  splitKeysBySchema,
} from './runtime/envBuilder';
export type {
  StagesFactoryInput,
  StagesFactoryOutput,
} from './serverless/stagesFactory';
export { stagesFactory } from './serverless/stagesFactory';
