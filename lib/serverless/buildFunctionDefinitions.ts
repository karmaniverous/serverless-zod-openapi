// File: lib/serverless/buildFunctionDefinitions.ts
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AWS } from '@serverless/typescript';
import { packageDirectorySync } from 'package-directory';
import type z from 'zod';
import type { ZodObject, ZodRawShape } from 'zod';

import { resolveHttpFromFunctionConfig } from '@@/lib/http/resolveHttpFromFunctionConfig';
import type { FunctionConfig } from '@@/lib/types/FunctionConfig';
import { serverlessConfigSchema } from '@@/src/config/serverlessConfig';
import { type AllParamsKeys, buildFnEnv } from '@@/src/config/stages';

type AwsFunctions = AWS['functions'];
type AwsFunction = AwsFunctions extends Record<string, infer FT> ? FT : never;

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
  GlobalParams extends ZodObject<ZodRawShape>,
  StageParams extends ZodObject<ZodRawShape>,
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

  // Compute "file.export" handler string relative to repo root
  const repoRoot = packageDirectorySync()!;
  const callerDir = dirname(fileURLToPath(callerModuleUrl));
  const handlerFileAbs = join(callerDir, parsed.defaultHandlerFileName);
  const handlerFileRel = relative(repoRoot, handlerFileAbs)
    .split(sep)
    .join('/');
  const handler = `${handlerFileRel}.${parsed.defaultHandlerFileExport}`;

  let events: AwsFunction['events'] = [];

  // If this is an HTTP function, add the http events
  try {
    const { method, basePath, contexts } = resolveHttpFromFunctionConfig(
      functionConfig,
      callerModuleUrl,
    );
    const path = normalizePath(basePath);
    const httpEvents: HttpEvent[] = (
      contexts.length ? contexts : ['public']
    ).map((ctx) => ({
      http: {
        method: normalizeMethod(method),
        path: path,
      } as HttpEventObject,
    }));
    events = [...httpEvents] as unknown as AwsFunction['events'];
  } catch {
    // Non-HTTP functions simply do not get http events; other triggers may be present in config.
    events =
      (functionConfig as { events?: AwsFunction['events'] }).events ?? [];
  }

  const def: AwsFunction = {
    handler,
    events,
    // Environment populated via parsed param schemas + fnEnvKeys
    environment: buildFnEnv(
      (functionConfig.fnEnvKeys ??
        []) as readonly string[] as readonly AllParamsKeys[],
    ),
  } as unknown as AwsFunction;

  return {
    [functionConfig.functionName]: def,
  } as AWS['functions'];
};
