import type {
  APIGatewayEventRequestContextV2,
  APIGatewayProxyEvent,
  APIGatewayProxyEventHeaders,
  APIGatewayProxyEventV2,
} from 'aws-lambda';

import type { SecurityContext } from './SecurityContext';

// v1 vs v2 guard
export const isV1 = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
): event is APIGatewayProxyEvent =>
  'identity' in (event as APIGatewayProxyEvent).requestContext;

// Minimal shape for v2 authorizer (keeps us any-free)
type V2AuthorizerShape = {
  jwt?: { claims?: Record<string, unknown>; scopes?: string[] };
  iam?: Record<string, unknown>;
  lambda?: Record<string, unknown>;
};
const getV2Authorizer = (
  ctx: APIGatewayEventRequestContextV2,
): V2AuthorizerShape | undefined =>
  (ctx as unknown as { authorizer?: V2AuthorizerShape }).authorizer;

// Accept BOTH v1 and v2 header maps (v1 values may be undefined)
type HeaderMap = Readonly<Record<string, string | undefined>>;
const getHeader = (
  headers: HeaderMap | undefined | null,
  nameLower: string,
): string | undefined => {
  if (!headers) return undefined;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === nameLower);
  return key ? headers[key] : undefined;
};

export const detectSecurityContext = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
): SecurityContext => {
  if (isV1(event)) {
    const { identity, authorizer } = event.requestContext;
    if (authorizer) return 'my';
    if (identity.apiKeyId || identity.apiKey) return 'private';
    return 'public';
  }

  // v2
  const auth = getV2Authorizer(event.requestContext);
  if (auth) return 'my';

  // v2 API-key setups often rely on the header
  const apiKey = getHeader(
    event.headers as
      | APIGatewayProxyEventHeaders
      | Record<string, string>
      | undefined,
    'x-api-key',
  );
  return apiKey ? 'private' : 'public';
};
