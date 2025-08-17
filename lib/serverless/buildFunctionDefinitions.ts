import type { AWS } from '@serverless/typescript';
import type { z, ZodObject, ZodRawShape } from 'zod';

import { resolveHttpFromFunctionConfig } from '@@/lib/http/resolveHttpFromFunctionConfig';
import { modulePathFromRoot } from '@@/lib/modulePathFromRoot';
import { buildPathElements } from '@@/lib/path/buildPath';
import type { BaseEventTypeMap } from '@@/lib/types/BaseEventTypeMap';
import type { FunctionConfig } from '@@/lib/types/FunctionConfig';
import { serverlessConfigSchema } from '@@/src/config/serverlessConfig';
import { type AllParamsKeys, buildFnEnv } from '@@/src/config/stages';

type HttpEventObject = { method: string; path: string } & Record<
  string,
  unknown
>;
type HttpEvent = { http: string | HttpEventObject };

const normalizePath = (p: string) => `/${p.replace(/^\/+/, '')}`;
const normalizeMethod = (m: string) => m.toLowerCase();

const toHttpObject = (e: HttpEvent): HttpEventObject => {
  if (typeof e.http === 'string') {
    const [m = '', ...rest] = e.http.trim().split(/\s+/);
    const method = normalizeMethod(m);
    const path = normalizePath(rest.join(' ') || '/');
    return { method, path };
  }
  return e.http;
};

export const buildFunctionDefinitions = <
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  GlobalParams extends ZodObject<ZodRawShape>,
  StageParams extends ZodObject<ZodRawShape>,
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
  rawServerlessConfig: z.input<typeof serverlessConfigSchema>,
  callerModuleUrl: string,
): AWS['functions'] => {
  const parsed = serverlessConfigSchema.parse(rawServerlessConfig);

  // Generate HTTP events per context (if applicable)
  const generatedByKey: Record<string, HttpEventObject> = {};
  const resolved = resolveHttpFromFunctionConfig(
    functionConfig,
    callerModuleUrl,
  );
  if (resolved) {
    const { method, basePath, contexts } = resolved;

    for (const ctx of contexts) {
      const path = normalizePath(buildPathElements(basePath, ctx).join('/'));
      const httpEvent = {
        method,
        path,
        ...parsed.httpContextEventMap?.[ctx],
      } as HttpEventObject;
      generatedByKey[ctx] = httpEvent;
    }
  }

  // Merge any authored HTTP events with generated defaults (by context key)
  const baseHttpEvents = (
    functionConfig.events as unknown as {
      http?: string | HttpEventObject;
    }[]
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
    const override = baseHttpMatchingByKey[key];
    if (override) {
      const mergedObj: HttpEventObject = {
        ...genObj,
        ...(toHttpObject(override) as Record<string, unknown>),
      };
      mergedGenerated.push({ http: mergedObj });
    } else {
      mergedGenerated.push({ http: genObj });
    }
  }

  const events = [
    ...((functionConfig.events ?? []) as { http?: string | HttpEventObject }[]),
    ...mergedGenerated,
  ];

  // Default handler string: <dir>/<defaultFile>.<defaultExport>
  const dirFromRoot = modulePathFromRoot(callerModuleUrl);
  const handler = `${dirFromRoot}/${parsed.defaultHandlerFileName}.${parsed.defaultHandlerFileExport}`;

  const def = {
    handler,
    events,
    // Environment populated via parsed param schemas + fnEnvKeys
    environment: buildFnEnv(
      (functionConfig.fnEnvKeys ??
        []) as readonly string[] as readonly AllParamsKeys[],
    ),
  };

  return {
    [functionConfig.functionName]: def,
  } as AWS['functions'];
};
