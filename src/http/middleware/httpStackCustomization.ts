/**
 * HTTP Middleware Customization (barrel)
 *
 * Modular surface:
 * - Types: HttpStackOptions, HttpProfile, AppHttpConfig, FunctionHttpConfig
 * - computeHttpMiddleware: builds the final Middy stack with options/profiles/extends/transforms
 * - Transform helpers: getId, tagStep, HttpTransform, PhasedArrays
 */
export { computeHttpMiddleware } from './customization/compute';
export { buildSafeDefaults } from './customization/defaultSteps';
export type {
  AppHttpConfig,
  FunctionHttpConfig,
  HttpProfile,
  HttpStackOptions,
} from './customization/types';
export {
  getId,
  type HttpTransform,
  type PhasedArrays,
  tagStep,
} from './transformUtils';
