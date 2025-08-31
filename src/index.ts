/**
 * Public entry point for the toolkit. Stack code must import only from '@@/src'.
 * Exposes runtime wrappers, middleware, builders, and commonly used types.
 */
export { makeWrapHandler } from './handler/makeWrapHandler';
export { buildHttpMiddlewareStack } from './handler/middleware/buildHttpMiddlewareStack';
export { httpZodValidator } from './handler/middleware/httpZodValidator';
export { shortCircuitHead } from './handler/middleware/shortCircuitHead';
export { combine } from './handler/middleware/combine';
export { asApiMiddleware } from './handler/middleware/asApiMiddleware';

export { detectSecurityContext } from './handler/detectSecurityContext';

export { buildFunctionDefinitions } from './serverless/buildFunctionDefinitions';
export { buildPathItemObject } from './openapi/buildPathItemObject';

export { makeFunctionConfig } from './handler/makeFunctionConfig';

// Types
export type { FunctionConfig } from './types/FunctionConfig';
export type { BaseEventTypeMap } from './types/BaseEventTypeMap';
export type { HttpContext } from './types/HttpContext';
export type { ConsoleLogger } from './types/Loggable';
export type { SecurityContextHttpEventMap } from './types/SecurityContextHttpEventMap';
export type { Handler } from './types/Handler';
export type { LambdaEvent } from './types/LambdaEvent';

// Optional helper exports
export {
  buildEnvSchema,
  deriveAllKeys,
  splitKeysBySchema,
  parseTypedEnv,
} from './handler/envBuilder';
export { stagesFactory } from './serverless/stagesFactory';
