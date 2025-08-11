import type {
  APIGatewayEventRequestContextV2,
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
} from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { detectSecurityContext, isV1 } from './detectSecurityContext';

/* ------------------------------ factories ------------------------------ */

const createV1 = (
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent =>
  ({
    headers: {},
    requestContext: {
      identity: { apiKeyId: undefined, apiKey: undefined },
      authorizer: undefined,
    },
    ...overrides,
  }) as unknown as APIGatewayProxyEvent;

const createV2 = (
  overrides: Partial<APIGatewayProxyEventV2> = {},
): APIGatewayProxyEventV2 =>
  ({
    headers: {},
    requestContext: {
      accountId: 'acc',
      apiId: 'api',
      domainName: 'example.com',
      domainPrefix: 'ex',
      http: {
        method: 'GET',
        path: '/',
        protocol: 'HTTP/1.1',
        sourceIp: 'ip',
        userAgent: 'ua',
      },
      requestId: 'rid',
      routeKey: '$default',
      stage: 'test',
      time: '',
      timeEpoch: Date.now(),
    },
    ...overrides,
  }) as unknown as APIGatewayProxyEventV2;

/**
 * Create a V2 event whose requestContext is *typed* to include an authorizer,
 * without using `any` or unsafe member access.
 */
const createV2WithAuthorizer = (
  authorizer: unknown,
  overrides: Partial<APIGatewayProxyEventV2> = {},
): APIGatewayProxyEventV2 => {
  const base = createV2(overrides);

  const ctx = {
    ...base.requestContext,
    authorizer,
  } as APIGatewayEventRequestContextV2 & { authorizer: unknown };

  return {
    ...base,
    requestContext: ctx,
  } as APIGatewayProxyEventV2;
};

/* --------------------------------- tests -------------------------------- */

describe('isV1', () => {
  it('returns true for a V1 event and false for a V2 event', () => {
    expect(isV1(createV1())).toBe(true);
    expect(isV1(createV2())).toBe(false);
  });
});

describe('detectSecurityContext', () => {
  it('V1: returns "my" when authorizer is present', () => {
    const v1 = createV1({
      requestContext: {
        identity: { apiKeyId: undefined, apiKey: undefined },
        authorizer: {}, // truthy object indicates an authenticated request
      } as unknown as APIGatewayProxyEvent['requestContext'],
    });
    expect(detectSecurityContext(v1)).toBe('my');
  });

  it('V1: returns "private" when API key present (no authorizer)', () => {
    const v1 = createV1({
      requestContext: {
        identity: { apiKeyId: 'id-123', apiKey: undefined },
        authorizer: undefined,
      } as unknown as APIGatewayProxyEvent['requestContext'],
    });
    expect(detectSecurityContext(v1)).toBe('private');
  });

  it('V1: returns "public" when no authorizer and no API key', () => {
    expect(detectSecurityContext(createV1())).toBe('public');
  });

  it('V2: returns "my" when an authorizer (jwt/iam/lambda) is present', () => {
    const v2 = createV2WithAuthorizer({ jwt: { claims: {} } });
    expect(detectSecurityContext(v2)).toBe('my');
  });

  it('V2: returns "private" when x-api-key header present (case-insensitive)', () => {
    const v2 = createV2({ headers: { 'X-API-Key': 'abc123' } });
    expect(detectSecurityContext(v2)).toBe('private');
  });

  it('V2: returns "public" when no authorizer and no x-api-key', () => {
    expect(detectSecurityContext(createV2())).toBe('public');
  });
});
