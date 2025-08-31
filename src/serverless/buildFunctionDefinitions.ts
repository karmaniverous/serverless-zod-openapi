import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AWS } from '@serverless/typescript';
import { packageDirectorySync } from 'package-directory';
import type { z } from 'zod';

import { resolveHttpFromFunctionConfig } from '@/src/http/resolveHttpFromFunctionConfig';
import type { BaseEventTypeMap } from '@/src/types/BaseEventTypeMap';
import type { FunctionConfig } from '@/src/types/FunctionConfig';
import type { SecurityContextHttpEventMap } from '@/src/types/SecurityContextHttpEventMap';

type HttpEventObject = { method: string; path: string } & Record<
  string,
  unknown
>;
type HttpEvent = { http: string | HttpEventObject };

type ServerlessConfigLike = {
  httpContextEventMap: SecurityContextHttpEventMap;
  defaultHandlerFileName: string;
  defaultHandlerFileExport: string;
};

const normalizePath = (p: string) => `/${p.replace(/^\/+/, '')}`;
const normalizeMethod = (m: string) => m.toLowerCase();

export const buildFunctionDefinitions = <
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
  appConfig: ServerlessConfigLike,
  callerModuleUrl: string,
  endpointsRootAbs: string,
  buildFnEnv: (
    fnEnvKeys?: readonly (keyof (GlobalParams & StageParams))[],
  ) => Record<string, string>,
): AWS['functions'] => {
  const parsed = appConfig;

  // Compute "file.export" handler string relative to repo root
  const repoRoot = packageDirectorySync()!;
  const callerDir = dirname(fileURLToPath(callerModuleUrl));
  const handlerFileAbs = join(callerDir, parsed.defaultHandlerFileName);
  const handlerFileRel = relative(repoRoot, handlerFileAbs)
    .split(sep)
    .join('/');
  const handler = `${handlerFileRel}.${parsed.defaultHandlerFileExport}`;

  let events: unknown = [];

  // If this is an HTTP function, add the http events
  try {
    const { method, basePath, contexts } = resolveHttpFromFunctionConfig(
      functionConfig,
      callerModuleUrl,
      endpointsRootAbs,
    );
    const path = normalizePath(basePath);
    const httpEvents: HttpEvent[] = (
      contexts.length ? contexts : ['public']
    ).map(() => ({
      http: {
        method: normalizeMethod(method),
        path: path,
      } as HttpEventObject,
    }));
    events = [...httpEvents];
  } catch {
    // Non-HTTP functions simply do not get http events; other triggers may be present in config.
    const nonHttp = (functionConfig as { events?: unknown }).events;
    events = nonHttp ?? [];
  }

  const def: Record<string, unknown> = {
    handler,
    events,
    // Environment populated via parsed param schemas + fnEnvKeys
    environment: buildFnEnv(functionConfig.fnEnvKeys),
  };

  return {
    [functionConfig.functionName]: def as unknown,
  } as unknown as AWS['functions'];
};