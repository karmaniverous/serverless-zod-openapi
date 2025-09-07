import { describe, expect, it } from 'vitest';

import {
  buildAllServerlessFunctions,
  type RegEntry,
  type ServerlessConfigLike,
} from '@/src/serverless/buildServerless';

describe('serverless/buildServerlessFunctions', () => {
  const serverlessCfg: ServerlessConfigLike = {
    defaultHandlerFileName: 'handler',
    defaultHandlerFileExport: 'handler',
  };
  const buildFnEnv = (keys?: readonly never[]) => {
    // Simulate mapping; ensure only keys requested are returned.
    const out: Record<string, string> = {};
    (keys ?? []).forEach((k) => {
      out[String(k)] = `\${param:${String(k)}}`;
    });
    return out;
  };

  it('produces HTTP events for contexts and merges per-function env extras only', () => {
    const reg: RegEntry[] = [
      {
        functionName: 'users_get',
        eventType: 'rest',
        method: 'get',
        basePath: 'users',
        httpContexts: ['public', 'private'],
        contentType: 'application/json',
        fnEnvKeys: ['PROFILE', 'DOMAIN_NAME'],
        callerModuleUrl: new URL('file:///tmp/sandbox/app/functions/rest/users/get/lambda.ts').href,
        endpointsRootAbs: '/tmp/sandbox/app/functions/rest',
      },
    ];
    const out = buildAllServerlessFunctions(reg, serverlessCfg, buildFnEnv);
    expect(out).toHaveProperty('users_get');
    const fn = out!.users_get as unknown as {
      events: Array<{ http: { method: string; path: string } }>;
      environment: Record<string, string>;
      handler: string;
    };
    expect(fn.events.length).toBe(2);
    const paths = fn.events.map((e) => e.http.path).sort();
    expect(paths).toEqual(['/public/users', '/users']);
    expect(fn.environment).toEqual({
      PROFILE: '${param:PROFILE}',
      DOMAIN_NAME: '${param:DOMAIN_NAME}',
    });
    expect(typeof fn.handler).toBe('string');
    expect(fn.handler.endsWith('.handler')).toBe(true);
  });

  it('passes through non-HTTP serverless extras for non-HTTP entries', () => {
    const extraEvent = [{ schedule: { rate: ['rate(5 minutes)'] } }];
    const reg: RegEntry[] = [
      {
        functionName: 'tick',
        eventType: 'sqs',
        serverlessExtras: extraEvent,
        callerModuleUrl: new URL('file:///tmp/sandbox/app/functions/sqs/tick/lambda.ts').href,
        endpointsRootAbs: '/tmp/sandbox/app/functions/sqs',
      } as unknown as RegEntry,
    ];
    const out
