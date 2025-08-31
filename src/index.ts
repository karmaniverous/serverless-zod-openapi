/**
 * Public entry point for the toolkit. Stack code must import only from '@@/src'.
 * Exposes runtime wrappers, middleware, builders, and commonly used types.
 */
export { detectSecurityContext } from './handler/detectSecurityContext';
export { makeFunctionConfig } from './handler/makeFunctionConfig';
export type { LoadEnvConfig } from './handler/makeWrapHandler';
export { makeWrapHandler } from './handler/makeWrapHandler';
export { asApiMiddleware } from './handler/middleware/asApiMiddleware';
export { buildHttpMiddlewareStack } from './handler/middleware/buildHttpMiddlewareStack';
export { combine } from './handler/middleware/combine';
export { httpZodValidator } from './handler/middleware/httpZodValidator';
export { shortCircuitHead } from './handler/middleware/shortCircuitHead';
export { buildPathItemObject } from './openapi/buildPathItemObject';

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
export { buildPathItemObject as _keepExportOrderHint } from './openapi/buildPathItemObject';
export { stagesFactory } from './serverless/stagesFactory';
