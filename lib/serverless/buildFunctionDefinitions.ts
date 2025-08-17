import type { AWS } from '@serverless/typescript';
import type { z } from 'zod';

import { resolveHttpFromFunctionConfig } from '@@/lib/http/resolveHttpFromFunctionConfig';
import { modulePathFromRoot } from '@@/lib/modulePathFromRoot';
import { buildPathElements } from '@@/lib/path/buildPath';
import type { FunctionConfig } from '@@/lib/types/FunctionConfig';
import { serverlessConfigSchema } from '@@/src/config/serverlessConfig';
import { buildFnEnv } from '@@/src/config/stages';

type AwsFunctions = AWS['functions'];
type AwsFunction = AwsFunctions extends Record<string, infer FT> ? FT : never;

type HttpEventObject = { method: string; path: string } & Record<
  string,
  unknown
>;
type HttpEvent = { http: string | HttpEventObject };
type AnyEvent = HttpEvent | Record<string, unknown>;

const isHttpEvent = (e: AnyEvent): e is HttpEvent =>
  Object.prototype.hasOwnProperty.call(e, 'http');

const normalizeMethod = (m: string): string => m.trim().toLowerCase();
const normalizePath = (p: string): string =>
  p.replace(/\\/g, '/').replace(/^\//, '');
const keyFor = (method: string, path: string): string =>
  `${normalizeMethod(method)} ${path}`;

const httpEventKey = (e: HttpEvent): string => {
  if (typeof e.http === 'string') {
    const [m, ...rest] = e.http.trim().split(/\s+/);
    const method = normalizeMethod(m ?? '');
    const path = normalizePath(rest.join(' ') || '/');
    return keyFor(method, path);
  }
  const { method, path } = e.http;
  return keyFor(method, normalizePath(path));
};

const toHttpObject = (e: HttpEvent): HttpEventObject => {
  if (typeof e.http === 'string') {
    const [m, ...rest] = e.http.trim().split(/\s+/);
    const method = normalizeMethod(m ?? '');
    const path = normalizePath(rest.join(' ') || '/');
    return { method, path };
  }
  const { method, path, ...rest } = e.http;
  return {
    method: normalizeMethod(method),
    path: normalizePath(path),
    ...rest,
  };
};

export const buildFunctionDefinitions = <
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
>(
  functionConfig: FunctionConfig<EventSchema, ResponseSchema>,
  rawServerlessConfig: z.input<typeof serverlessConfigSchema>,
  callerModuleUrl: string,
): AWS['functions'] => {
  const parsed = serverlessConfigSchema.parse(rawServerlessConfig);

  const resolved = resolveHttpFromFunctionConfig(
    functionConfig,
    callerModuleUrl,
  );
  const generatedByKey: Record<string, HttpEventObject> = {};

  if (resolved) {
    const { method, basePath, contexts } = resolved;

    for (const ctx of contexts) {
      const path = normalizePath(buildPathElements(basePath, ctx).join('/'));
      const httpEvent = {
        method,
        path,
        ...(parsed.httpContextEventMap[ctx] as Record<string, unknown>),
      };
      generatedByKey[keyFor(method, path)] = httpEvent;
    }
  }

  const baseEvents = functionConfig.events as AnyEvent[];

  const preservedNonHttp: AnyEvent[] = [];
  const preservedHttpNonMatching: HttpEvent[] = [];
  const baseHttpMatchingByKey: Record<string, HttpEvent> = {};

  for (const ev of baseEvents) {
    if (!isHttpEvent(ev)) {
      preservedNonHttp.push(ev);
      continue;
    }
    const key = httpEventKey(ev);
    if (key in generatedByKey) {
      baseHttpMatchingByKey[key] = ev;
    } else {
      preservedHttpNonMatching.push(ev);
    }
  }

  const mergedGenerated: HttpEvent[] = [];
  for (const [key, genObj] of Object.entries(generatedByKey)) {
    const match = baseHttpMatchingByKey[key];
    if (match) {
      const overrideObj =
        typeof match.http === 'string' ? {} : toHttpObject(match);
      const mergedObj: HttpEventObject = {
        ...genObj,
        ...(overrideObj as Record<string, unknown>),
      };
      mergedGenerated.push({ http: mergedObj });
    } else {
      mergedGenerated.push({ http: genObj });
    }
  }

  const finalEvents = [
    ...preservedNonHttp,
    ...preservedHttpNonMatching,
    ...mergedGenerated,
  ] as AwsFunction['events'];

  const environment = buildFnEnv(functionConfig.fnEnvKeys);

  const handler = `${modulePathFromRoot(callerModuleUrl)}/${parsed.defaultHandlerFileName}.${parsed.defaultHandlerFileExport}`;

  const fnKey = functionConfig.functionName;
  return {
    [fnKey]: {
      handler,
      environment,
      events: finalEvents,
    },
  };
};
