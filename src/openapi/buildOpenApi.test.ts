import { describe, expect, it } from 'vitest';

import {
  buildAllOpenApiPaths,
  type RegEntry,
} from '@/src/openapi/buildOpenApi';

describe('openapi/buildAllOpenApiPaths', () => {
  it('builds path items per context with augmented summary, tags, and composed operationIds', () => {
    const reg: RegEntry[] = [
      {
        functionName: 'users_get',
        eventType: 'rest',
        method: 'get',
        basePath: 'users',
        httpContexts: ['public', 'private'],
        callerModuleUrl: new URL('file:///tmp/sandbox/app/functions/rest/users/get/openapi.ts')
          .href,
        endpointsRootAbs: '/tmp/sandbox/app/functions/rest',
        openapiBaseOperation: {
          summary: 'List users',
          description: 'Return a list of users.',
          tags: ['users'],
          responses: {},
        },
      },
    ];
    const paths = buildAllOpenApiPaths(reg);
    expect(paths).toHaveProperty('/users');
    expect(paths).toHaveProperty('/private/users');
    const pub = (paths as Record<string, unknown>)['/users'] as Record<string, unknown>;
    const priv = (paths as Record<string, unknown>)['/private/users'] as Record<string, unknown>;
    const pubGet = pub.get as { operationId: string; summary: string; tags: string[] };
    const privGet = priv.get as { operationId: string; summary: string; tags: string[] };
    expect(pubGet.operationId).toBe('users_get');
    expect(privGet.operationId).toBe('private_users_get');
    expect(pubGet.summary).toMatch(/List users \(public\)/i);
    expect(privGet.summary).toMatch(/List users \(private\)/i);
    expect(pubGet.tags).toEqual(expect.arrayContaining(['users', 'public']));
    expect(privGet.tags).toEqual(expect.arrayContaining(['users', 'private']));
  });
});

