import type { AWS } from '@serverless/typescript';
import type { ZodObject, ZodRawShape } from 'zod';

import { resolveHttpFromFunctionConfig } from '@@/lib/http/resolveHttpFromFunctionConfig';
import { modulePathFromRoot } from '@@/lib/modulePathFromRoot';
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
  EventSchema,
  ResponseSchema,
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
  callerModuleUrl: string,
): AWS['functions'] => {
  const parsed = serverlessConfigSchema.parse({
    defaultHandlerFileExport: 'handler',
  });

  const handler = modulePathFromRoot({
    from: callerModuleUrl,
    to: `@@/src/endpoints/${functionConfig.functionName}/handler`,
    exportName: parsed.defaultHandlerFileExport,
  });

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
        'x-context': ctx,
      } as HttpEventObject,
    }));
    events = [...httpEvents] as AwsFunction['events'];
  } catch {
    // Non-HTTP functions simply do not get http events; other triggers may be present in config.
    events = [
      ...((functionConfig as { events?: AwsFunction['events'] }).events ?? []),
    ];
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
