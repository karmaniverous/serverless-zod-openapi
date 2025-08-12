import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';

/** Security context classification used throughout the handlers. */
export type SecurityContext = 'my' | 'private' | 'public';

/** Narrow to API Gateway v1 events with safe property checks. */
export const isV1 = (evt: unknown): evt is APIGatewayProxyEvent => {
  if (!evt || typeof evt !== 'object') return false;
  const obj = evt as { httpMethod?: unknown; requestContext?: unknown };
  return typeof obj.httpMethod === 'string' && obj.requestContext != null;
};

/** Narrow to API Gateway v2 events with safe property checks. */
export const isV2 = (evt: unknown): evt is APIGatewayProxyEventV2 => {
  if (!evt || typeof evt !== 'object') return false;
  const obj = evt as { version?: unknown; requestContext?: unknown };
  const rc = obj.requestContext as unknown;
  return (
    typeof obj.version === 'string' &&
    rc != null &&
    typeof rc === 'object' &&
    'http' in (rc as Record<string, unknown>)
  );
};

/** Case-insensitive single-value header lookup. */
const getHeader = (
  headers: Record<string, string | undefined> | null | undefined,
  key: string,
): string | undefined => {
  if (!headers) return undefined;
  const direct = headers[key];
  if (typeof direct === 'string') return direct;
  const found = Object.keys(headers).find(
    (k) => k.toLowerCase() === key.toLowerCase(),
  );
  return found ? headers[found] : undefined;
};

/** Case-insensitive multi-value header lookup. */
const getMultiHeader = (
  headers: Record<string, string[] | undefined> | null | undefined,
  key: string,
): string | undefined => {
  if (!headers) return undefined;
  const direct = headers[key];
  if (Array.isArray(direct) && direct.length > 0) return direct[0];
  const found = Object.keys(headers).find(
    (k) => k.toLowerCase() === key.toLowerCase(),
  );
  const val = found ? headers[found] : undefined;
  return Array.isArray(val) && val.length > 0 ? val[0] : undefined;
};

/** Get a header value from either single- or multi-value maps. */
const getHeaderFromEvent = (
  evt: APIGatewayProxyEvent | APIGatewayProxyEventV2,
  key: string,
): string | undefined => {
  const single = getHeader(
    (evt as { headers?: Record<string, string | undefined> }).headers,
    key,
  );
  if (typeof single === 'string') return single;
  const multi = getMultiHeader(
    (evt as { multiValueHeaders?: Record<string, string[] | undefined> })
      .multiValueHeaders,
    key,
  );
  return multi;
};

const hasAwsSig = (auth: string | undefined): boolean =>
  typeof auth === 'string' && auth.startsWith('AWS4-HMAC-SHA256');

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
  evt: APIGatewayProxyEvent | APIGatewayProxyEventV2,
): boolean => typeof getHeaderFromEvent(evt, 'x-api-key') === 'string';

/** Classify the security context from either API Gateway event version. */
export const detectSecurityContext = (evt: unknown): SecurityContext => {
  if (isV1(evt)) {
    const auth = getHeaderFromEvent(evt, 'authorization');
    if (hasAwsSig(auth) || hasV1AccessKey(evt) || hasAuthorizer(evt))
      return 'my';
    if (hasApiKey(evt)) return 'private';
    return 'public';
  }
  if (isV2(evt)) {
    const auth = getHeaderFromEvent(evt, 'authorization');
    if (hasAwsSig(auth) || hasAuthorizer(evt)) return 'my';
    if (hasApiKey(evt)) return 'private';
    return 'public';
  }
  return 'public';
};
