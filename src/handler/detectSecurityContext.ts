import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';

import type { HttpContext } from '@/src/types/HttpContext';

/** @category Public API */
/** @category HTTP Middleware */
/** Narrow to API Gateway v1 events with safe property checks. */
/**
 * Type guard for API Gateway v1 events. *
 * @param evt - unknown event
 * @returns true if the event looks like a v1 APIGatewayProxyEvent
 */
export const isV1 = (evt: unknown): evt is APIGatewayProxyEvent => {
  if (typeof evt !== 'object' || evt === null) return false;
  return 'httpMethod' in evt && 'requestContext' in evt;
};

/** Narrow to API Gateway v2 events with safe property checks. */
/**
 * Type guard for API Gateway v2 events.
 */
export const isV2 = (evt: unknown): evt is APIGatewayProxyEventV2 => {
  if (typeof evt !== 'object' || evt === null) return false;
  if (!('version' in evt) || !('requestContext' in evt)) return false;  const rc = (evt as { requestContext?: unknown }).requestContext;
  return (
    !!rc && typeof rc === 'object' && 'http' in (rc as Record<string, unknown>)
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
  return found ? headers[found]?.[0] : undefined;
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
  const rc = evt.requestContext as {
    identity?: { accessKey?: unknown; apiKey?: unknown };
  };
  const ak = rc.identity?.accessKey;
  return typeof ak === 'string' && ak.length > 0;
};

const hasAuthorizer = (
  evt: APIGatewayProxyEvent | APIGatewayProxyEventV2,
): boolean => {
  // V1: any truthy authorizer object indicates an authenticated request
  if (isV1(evt)) {
    const rc = evt.requestContext as { authorizer?: unknown };
    return !!rc.authorizer;
  }

  // V2: authorizer may include jwt/iam/lambda shapes
  const authHeader = getHeaderFromEvent(evt, 'authorization');
  if (hasAwsSig(authHeader)) return true;

  const rc = (evt as { requestContext: { authorizer?: unknown } })
    .requestContext;
  const { authorizer } = rc;
  if (!authorizer || typeof authorizer !== 'object') return false;

  const a = authorizer as Record<string, unknown> & {
    jwt?: unknown;
    iam?: unknown;
    lambda?: unknown;
  };

  return !!(a.jwt || a.iam || a.lambda);
};

/** Detect API key via header or v1 identity.apiKey. */
const hasApiKey = (
  evt: APIGatewayProxyEvent | APIGatewayProxyEventV2,
): boolean => {
  const fromHeader = getHeaderFromEvent(evt, 'x-api-key');
  if (typeof fromHeader === 'string') return true;

  // Some v1 events surface API key on requestContext.identity.apiKey
  if (isV1(evt)) {
    const rc = evt.requestContext as {
      identity?: { apiKey?: unknown; apiKeyId?: unknown };
    };
    const identKey = rc.identity?.apiKey;
    if (typeof identKey === 'string' && identKey.length > 0) return true;

    const identKeyId = rc.identity?.apiKeyId;
    if (typeof identKeyId === 'string' && identKeyId.length > 0) return true;
  }

  return false;
};

/** Classify the security context from either API Gateway event version. */
/**
 * Detect security context from API Gateway v1/v2 events.
 *
 * @param evt - unknown event
 * @returns 'my' when authorized (Cognito/JWT/IAM), 'private' when API key present, else 'public'
 */
export const detectSecurityContext = (evt: unknown): HttpContext => {
  if (isV1(evt)) {
    const auth = getHeaderFromEvent(evt, 'authorization');    if (hasAwsSig(auth) || hasV1AccessKey(evt) || hasAuthorizer(evt))
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
