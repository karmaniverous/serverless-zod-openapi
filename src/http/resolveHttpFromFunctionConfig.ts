import { dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { unique } from 'radash';
import type { z } from 'zod';

import { sanitizeBasePath } from '@/src/path/buildPath';
import type { BaseEventTypeMap } from '@/src/types/BaseEventTypeMap';
import type { MethodKey } from '@/src/types/FunctionConfig';
import type { FunctionConfig } from '@/src/types/FunctionConfig';
import type { HttpContext } from '@/src/types/HttpContext';

export const HTTP_METHODS: ReadonlySet<MethodKey> = new Set<MethodKey>([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
]);

export const resolveHttpFromFunctionConfig = <
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  GlobalParams extends Record<string, unknown>,
  StageParams extends Record<string, unknown>,
  EventTypeMap extends BaseEventTypeMap,
  EventType extends keyof EventTypeMap,
>(
  functionConfig: FunctionConfig<
    EventSchema,
    ResponseSchema,
    GlobalParams,
    StageParams,
    EventTypeMap,
    EventType
  >,
  callerModuleUrl: string,
  endpointsRootAbs: string,
): {
  method: MethodKey;
  basePath: string;
  contexts: readonly HttpContext[];
} => {
  const {
    method: maybeMethod,
    basePath: maybeBase,
    httpContexts,
  } = functionConfig as {
    method?: MethodKey;
    basePath?: string;
    httpContexts?: readonly HttpContext[];
  };

  let method: MethodKey;
  if (maybeMethod && HTTP_METHODS.has(maybeMethod)) {
    method = maybeMethod;
  } else {
    // derive from folder name
    const rel = relative(
      endpointsRootAbs,
      dirname(fileURLToPath(callerModuleUrl)),
    )
      .split(sep)
      .join('/');
    const segs = rel.split('/').filter(Boolean);
    const tail = segs[segs.length - 1]?.toLowerCase();
    method = HTTP_METHODS.has(tail as MethodKey) ? (tail as MethodKey) : 'get';
  }

  let basePath = sanitizeBasePath(maybeBase ?? '');
  if (!basePath) {
    const rel = relative(
      endpointsRootAbs,
      dirname(fileURLToPath(callerModuleUrl)),
    )
      .split(sep)
      .join('/');
    const segs = rel.split('/').filter(Boolean);
    if (segs.length && segs[segs.length - 1]?.toLowerCase() === method)
      segs.pop();
    basePath = segs.join('/');
  }

  if (!basePath) {
    throw new Error(
      'resolveHttpFromFunctionConfig: derived basePath is empty; ensure file is under endpoints root or set config.basePath.',
    );
  }

  const contexts = unique(httpContexts ?? []);
  return { method, basePath, contexts };
};
