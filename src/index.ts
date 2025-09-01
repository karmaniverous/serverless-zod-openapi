/**
 * Public entry point for the toolkit. Stack code must import only from '@/src'.
 * Exposes runtime wrappers, middleware, builders, and commonly used types.
 */
export type {
  DefineAppConfigInput,
  DefineAppConfigOutput,
  EnvKeysNode,
  EnvSchemaNode,
  GlobalEnvConfig,
  GlobalParamsNode,
  StageParamsNode,
} from './config/defineAppConfig';
export { defineAppConfig } from './config/defineAppConfig';
export { defineFunctionConfig } from './handler/defineFunctionConfig';
export { detectSecurityContext } from './handler/detectSecurityContext';
export { asApiMiddleware } from './handler/middleware/asApiMiddleware';
export { buildHttpMiddlewareStack } from './handler/middleware/buildHttpMiddlewareStack';
export { combine } from './handler/middleware/combine';
export { httpZodValidator } from './handler/middleware/httpZodValidator';
export { shortCircuitHead } from './handler/middleware/shortCircuitHead';
export { wrapHandler } from './handler/wrapHandler';
export { buildOpenApiPath } from './openapi/buildOpenApiPath';
export { buildServerlessFunctions } from './serverless/buildServerlessFunctions';

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
export { buildOpenApiPath as _keepExportOrderHint } from './openapi/buildOpenApiPath';
export { stagesFactory } from './serverless/stagesFactory';
