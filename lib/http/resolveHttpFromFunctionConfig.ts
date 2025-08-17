import { dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { unique } from 'radash';
import type { z } from 'zod';

import { sanitizeBasePath } from '@@/lib/path/buildPath';
import type { BaseEventTypeMap } from '@@/lib/types/BaseEventTypeMap';
import type { FunctionConfig, MethodKey } from '@@/lib/types/FunctionConfig';
import type { HttpContext } from '@@/lib/types/HttpContext';
import { ENDPOINTS_ROOT_ABS } from '@@/src/endpoints/_root';

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

/**
 * Resolve HTTP routing info from a function config + caller module URL.
 * - Returns undefined for non-HTTP functions (no httpContexts present).
 */
export const resolveHttpFromFunctionConfig = <
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
  callerModuleUrl: string,
):
  | {
      method: MethodKey;
      basePath: string;
      contexts: readonly HttpContext[];
    }
  | undefined => {
  const { httpContexts } = config as {
    httpContexts?: readonly HttpContext[];
  };
  if (!httpContexts || httpContexts.length === 0) return undefined;

  // 1) Method: explicit -> folder name
  let method: MethodKey | undefined = (config as { method?: MethodKey }).method;
  if (!method) {
    const absDir = dirname(fileURLToPath(callerModuleUrl));
    const lastSeg = absDir.split('/').filter(Boolean).pop();
    const candidate = (lastSeg ?? '').toLowerCase() as MethodKey;
    if (HTTP_METHODS.has(candidate)) method = candidate;
  }
  if (!method) {
    throw new Error(
      'resolveHttpFromFunctionConfig: could not infer method; set config.method or place under endpoints/<base>/<method>/',
    );
  }

  // 2) Base path: explicit -> parent folder(s)
  let basePath = sanitizeBasePath(
    (config as { basePath?: string }).basePath ?? '',
  );
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

  const contexts = unique(httpContexts);
  return { method, basePath, contexts };
};
