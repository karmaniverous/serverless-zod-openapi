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
  'trace',
]);

const toPosix = (p: string) => p.replace(/\\/g, '/');

type MaybeHttpEvent = { http?: string | { method?: string; path?: string } };

const isMaybeHttpEvent = (e: unknown): e is MaybeHttpEvent =>
  e !== null &&
  typeof e === 'object' &&
  Object.prototype.hasOwnProperty.call(e as Record<string, unknown>, 'http');

/** Derive {method, basePath, contexts} from FunctionConfig and the caller module's URL. */
export const resolveHttpFromFunctionConfig = (
  config: FunctionConfig<z.ZodType | undefined, z.ZodType | undefined>,
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

  if (!method && Array.isArray(config.events)) {
    const anyEvents = config.events as unknown[];
    const candidate = anyEvents.find(isMaybeHttpEvent);
    const http = candidate?.http;
    if (typeof http === 'string') {
      const [m] = http.trim().split(/\s+/);
      const mk = (m?.toLowerCase() ?? undefined) as MethodKey | undefined;
      if (mk && HTTP_METHODS.has(mk)) method = mk;
    } else if (http && typeof http.method === 'string') {
      const mk = http.method.toLowerCase() as MethodKey | undefined;
      if (mk && HTTP_METHODS.has(mk)) method = mk;
    }
  }

  if (!method) {
    throw new Error(
      'resolveHttpFromFunctionConfig: cannot determine HTTP method; provide config.method or use a method-named folder.',
    );
  }

  // 2) Base path: explicit -> folder path (minus trailing method)
  let basePath =
    (config.basePath && sanitizeBasePath(config.basePath)) || undefined;

  if (!basePath) {
    const absDir = dirname(fileURLToPath(callerModuleUrl));
    const rel = toPosix(relative(ENDPOINTS_ROOT_ABS, absDir));
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
