import { unique } from 'radash';
import type { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';

import { resolveHttpFromFunctionConfig } from '@/src/http/resolveHttpFromFunctionConfig';
import { buildPathElements } from '@/src/path/buildPath';
import type { BaseEventTypeMap } from '@/src/types/BaseEventTypeMap';
import type { FunctionConfig } from '@/src/types/FunctionConfig';
import type { SecurityContextHttpEventMap } from '@/src/types/SecurityContextHttpEventMap';

import type { BaseOperation } from './types';

type ServerlessConfigLike = {
  httpContextEventMap: SecurityContextHttpEventMap;
};
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
  _appConfig: ServerlessConfigLike,
  callerModuleUrl: string,
  baseOperation: BaseOperation,
  endpointsRootAbs: string,
): ZodOpenApiPathsObject => {
  // Resolve HTTP route details via injected endpoints root.
  const resolved = resolveHttpFromFunctionConfig(
    config,
    callerModuleUrl,
    endpointsRootAbs,
  );
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
