import { dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { unique } from 'radash';
import type { z } from 'zod';
import type { ZodOpenApiPathItemObject } from 'zod-openapi';

import { sanitizeBasePath } from '@@/lib/path/buildPath';
import type { FunctionConfig } from '@@/lib/types/FunctionConfig';
import type { HttpContext } from '@@/lib/types/HttpContext';
import { ENDPOINTS_ROOT_ABS } from '@@/src/endpoints/_root';

type MethodKey = keyof Omit<ZodOpenApiPathItemObject, 'id'>;

const HTTP_METHODS: ReadonlySet<MethodKey> = new Set<MethodKey>([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
]);

export const resolveHttpFromFunctionConfig = <
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  GlobalParams extends Record<string, unknown>,
  StageParams extends Record<string, unknown>,
  EventTypeMap,
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
  callerModuleUrl: string,
):
  | {
      method: MethodKey;
      basePath: string;
      contexts: readonly HttpContext[];
    }
  | undefined => {
  const contexts = config.httpContexts ? unique([...config.httpContexts]) : [];
  if (contexts.length === 0) return undefined;

  // 1) Method: explicit -> folder name -> authored http event
  let method: MethodKey | undefined = config.method;

  if (!method) {
    const absDir = dirname(fileURLToPath(callerModuleUrl));
    const rel = relative(ENDPOINTS_ROOT_ABS, absDir);
    const segments = rel.split(sep).filter(Boolean);
    const last = segments[segments.length - 1]?.toLowerCase();
    if (last && HTTP_METHODS.has(last as MethodKey)) method = last as MethodKey;
  }

  if (!method) {
    throw new Error(
      'resolveHttpFromFunctionConfig: could not infer method; set config.method or place under endpoints/<base>/<method>/',
    );
  }

  // 2) Base path: explicit -> parent folder(s)
  let basePath = sanitizeBasePath(config.basePath);
  if (!basePath) {
    const absDir = dirname(fileURLToPath(callerModuleUrl));
    const rel = relative(ENDPOINTS_ROOT_ABS, absDir);
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

  return { method, basePath, contexts };
};
