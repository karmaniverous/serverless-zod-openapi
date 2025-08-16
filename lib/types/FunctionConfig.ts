import type { AWS } from '@serverless/typescript';
import type { z } from 'zod';
import type { ZodOpenApiPathItemObject } from 'zod-openapi';

import type { HttpContext } from '@@/lib/types/HttpContext';
import type { PropFromUnion } from '@@/lib/types/PropFromUnion';
import type { AllParamsKeys } from '@@/src/config/stages';

/**
 * Unified per-function configuration:
 * - functionName (key in the Serverless functions map),
 * - env keys (for environment wiring),
 * - authored events (any Serverless events),
 * - wrapper schemas & content type,
 * - optional HTTP specifics (contexts, method, basePath).
 */
export type FunctionConfig<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
> = {
  /** Key for the function in the serverless functions map */
  functionName: string;

  /** Env keys to expose to the function */
  fnEnvKeys: readonly AllParamsKeys[];

  /** Author any set of events; builder will add/modify matching http events */
  events?: PropFromUnion<AWS['functions'], string>['events'];

  /** Wrapper-related options */
  contentType?: string;
  eventSchema?: EventSchema;
  responseSchema?: ResponseSchema;

  /** HTTP surface (optional for non-HTTP Lambdas) */
  httpContexts?: readonly HttpContext[];

  /** HTTP method; if omitted, inferred from folder name or authored http events */
  method?: keyof Omit<ZodOpenApiPathItemObject, 'id'>;

  /**
   * Base path without leading slash; if omitted, derived from caller module path
   * relative to endpoints root. Leading/trailing slashes are ignored.
   */
  basePath?: string;
};
