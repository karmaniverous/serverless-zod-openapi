import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';

/** Security context classification used throughout the handlers. */
export type SecurityContext = 'my' | 'private' | 'public';

/** Narrow to API Gateway v1 events without risking 'in' on undefined. */
export const isV1 = (evt: unknown): evt is APIGatewayProxyEvent => {
  if (!evt || typeof evt !== 'object') return false;
  const obj = evt as { httpMethod?: unknown; requestContext?: unknown };
  return (
    typeof obj.httpMethod === 'string' && typeof obj.requestContext === 'object'
  );
};

/** Narrow to API Gateway v2 events. */
export const isV2 = (evt: unknown): evt is APIGatewayProxyEventV2 => {
  if (!evt || typeof evt !== 'object') return false;
  const obj = evt as { version?: unknown; requestContext?: unknown };
  if (typeof obj.version !== 'string' || typeof obj.requestContext !== 'object')
    return false;
  // v2 requestContext has 'http' instead of 'identity'
  const rc = obj.requestContext as { http?: unknown };
  return !!rc && typeof rc === 'object' && 'http' in rc;
};

const getHeader = (
  headers: Record<string, string | undefined> | null | undefined,
  key: string,
): string | undefined => {
  if (!headers) return undefined;
  const direct = headers[key];
  if (typeof direct === 'string') return direct;
  // case-insensitive fallback
  const found = Object.keys(headers).find(
    (k) => k.toLowerCase() === key.toLowerCase(),
  );
  return found ? headers[found] : undefined;
};

const getAuthHeader = (
  headers: Record<string, string | undefined> | null | undefined,
): string | undefined => getHeader(headers, 'authorization');

const hasAwsSig = (auth: string | undefined): boolean =>
  !!auth && auth.startsWith('AWS4-HMAC-SHA256');

const hasV1AccessKey = (evt: APIGatewayProxyEvent): boolean => {
  const rc = evt.requestContext as unknown as {
    identity?: { accessKey?: unknown };
  };
  const ak = rc.identity?.accessKey;
  return typeof ak === 'string' && ak.length > 0;
};

const hasAuthorizer = (
  evt: APIGatewayProxyEvent | APIGatewayProxyEventV2,
): boolean => {
  const rc = evt.requestContext as unknown as { authorizer?: unknown };
  return rc.authorizer !== undefined && rc.authorizer !== null;
};

const hasApiKey = (
  headers: Record<string, string | undefined> | null | undefined,
): boolean => typeof getHeader(headers, 'x-api-key') === 'string';

/** Classify the security context from either API Gateway event version. */
export const detectSecurityContext = (evt: unknown): SecurityContext => {
  if (isV1(evt)) {
    const auth = getAuthHeader(
      evt.headers as Record<string, string | undefined> | undefined,
    );
    if (hasAwsSig(auth) || hasV1AccessKey(evt) || hasAuthorizer(evt))
      return 'my';
    if (
      hasApiKey(evt.headers as Record<string, string | undefined> | undefined)
    )
      return 'private';
    return 'public';
  }
  if (isV2(evt)) {
    const auth = getAuthHeader(
      evt.headers as Record<string, string | undefined> | undefined,
    );
    if (hasAwsSig(auth) || hasAuthorizer(evt)) return 'my';
    if (
      hasApiKey(evt.headers as Record<string, string | undefined> | undefined)
    )
      return 'private';
    return 'public';
  }
  return 'public';
};

