import { unique } from 'radash';
import type { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';

import { resolveHttpFromFunctionConfig } from '@@/lib/http/resolveHttpFromFunctionConfig';
import { buildPathElements } from '@@/lib/path/buildPath';
import type { BaseEventTypeMap } from '@@/lib/types/BaseEventTypeMap';
import type { FunctionConfig } from '@@/lib/types/FunctionConfig';
import { serverlessConfigSchema } from '@@/src/config/serverlessConfig';

import type { BaseOperation } from './types';

/**
 * Build OpenAPI path items for a single function config.
 * If no httpContexts are present, returns an empty object.
 */
export const buildPathItemObject = <
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  GlobalParams extends Record<string, unknown>,
  StageParams extends Record<string, unknown>,
  EventTypeMap extends BaseEventTypeMap,
  EventType extends keyof EventTypeMap,
>(
  config: FunctionConfig<
    EventSchema,
    ResponseSchema,
    GlobalParams,
    StageParams,
    EventTypeMap,
    EventType
  >,
  rawServerlessConfig: z.input<typeof serverlessConfigSchema>,
  callerModuleUrl: string,
  baseOperation: BaseOperation,
): ZodOpenApiPathsObject => {
  // Keep Serverless & OpenAPI aligned (and validated)
  serverlessConfigSchema.parse(rawServerlessConfig);

  const resolved = resolveHttpFromFunctionConfig(config, callerModuleUrl);
  const { method, basePath, contexts } = resolved;

  // Build a path item per context, tagging operations properly.
  return contexts.reduce<ZodOpenApiPathsObject>((acc, context) => {
    const pathElements = buildPathElements(basePath, context);

    return {
      ...acc,
      [`/${pathElements.join('/')}`]: {
        [method]: {
          ...baseOperation,
          operationId: [...pathElements, method].join('_'),
          summary: `${baseOperation.summary} (${context})`,
          tags: unique([...(baseOperation.tags ?? []), context]),
        },
      },
    };
  }, {});
};
