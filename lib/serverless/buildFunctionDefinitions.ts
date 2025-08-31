import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AWS } from '@serverless/typescript';
import { packageDirectorySync } from 'package-directory';
import type z from 'zod';

import { resolveHttpFromFunctionConfig } from '@@/lib/http/resolveHttpFromFunctionConfig';
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
  rawServerlessConfig: z.input<typeof serverlessConfigSchema>,
  callerModuleUrl: string,
): AWS['functions'] => {
  const parsed = serverlessConfigSchema.parse(rawServerlessConfig);

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
    environment: buildFnEnv(
      functionConfig.fnEnvKeys as readonly AllParamsKeys[] | undefined,
    ),
  };

  return {
    [functionConfig.functionName]: def as unknown,
  } as unknown as AWS['functions'];
};
