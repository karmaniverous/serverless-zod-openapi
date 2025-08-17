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
type HttpEvent = { http: HttpEventObject };

const normalizePath = (p: string) => `/${p.replace(/^\/+/, '')}`;
const normalizeMethod = (m: string) => m.toLowerCase();

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
  GlobalParams extends Record<string, unknown>,
  StageParams extends Record<string, unknown>,
  EventTypeMap,
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
        ...(parsed.httpContextEventMap?.[ctx] ?? {}),
      } as HttpEventObject;
      generatedByKey[ctx] = httpEvent;
    }
  }

  // Merge any authored HTTP events with generated defaults (by context key)
  const baseHttpEvents = (
    (functionConfig.events as unknown as
      | { http?: HttpEventObject }[]
      | undefined) ?? []
  ).filter((e) => e && typeof e === 'object' && 'http' in e) as HttpEvent[];

  const baseHttpMatchingByKey: Record<string, HttpEvent> = {};
  for (const e of baseHttpEvents) {
    const obj = toHttpObject(e);
    const key = obj.path.split('/')[1] ?? '';
    if (!key) continue;
    baseHttpMatchingByKey[key] = e;
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

  const events: NonNullable<AwsFunction['events']> = [
    ...((functionConfig.events ?? []) as NonNullable<AwsFunction['events']>),
    ...mergedGenerated,
  ];

  const def: AwsFunction = {
    // Default handler path: src/*/**/handler.ts export handler
    handler: modulePathFromRoot(
      parsed.defaultHandlerFileName,
      parsed.defaultHandlerFileExport,
      callerModuleUrl,
    ),
    events,
    // Environment: populated via parsed param schemas + fnEnvKeys
    // (function-specific overrides merged in stage config utility)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    environment: buildFnEnv(functionConfig.fnEnvKeys ?? []),
  };

  return {
    [functionConfig.functionName]: def,
  } as AWS['functions'];
};
