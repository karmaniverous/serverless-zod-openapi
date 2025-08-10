import type {
  APIGatewayEventRequestContextV2,
  APIGatewayProxyEvent,
  APIGatewayProxyEventHeaders,
  APIGatewayProxyEventV2,
} from 'aws-lambda';

import type { SecurityContext } from './SecurityContext';

/**
 * Type guard to check if an event is a V1 API Gateway event.
 *
 * @param event The event to check.
 * @returns `true` if the event is a V1 event, `false` otherwise.
 */
export const isV1 = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
): event is APIGatewayProxyEvent =>
  // V1 events have an `identity` property on the `requestContext`.
  'identity' in (event as APIGatewayProxyEvent).requestContext;

/**
 * A minimal shape for a V2 authorizer.
 */
type V2AuthorizerShape = {
  jwt?: { claims?: Record<string, unknown>; scopes?: string[] };
  iam?: Record<string, unknown>;
  lambda?: Record<string, unknown>;
};

/**
 * Gets the authorizer from a V2 request context.
 *
 * @param ctx The V2 request context.
 * @returns The authorizer, or `undefined` if it doesn't exist.
 */
const getV2Authorizer = (
  ctx: APIGatewayEventRequestContextV2,
): V2AuthorizerShape | undefined =>
  // The `authorizer` property is not part of the official V2 request context type,
  // but it is present when an authorizer is used.
  (ctx as unknown as { authorizer?: V2AuthorizerShape }).authorizer;

/**
 * A map of headers.
 */
type HeaderMap = Readonly<Record<string, string | undefined>>;

/**
 * Gets a header from a map of headers, case-insensitively.
 *
 * @param headers The map of headers.
 * @param nameLower The lowercase name of the header to get.
 * @returns The header value, or `undefined` if it doesn't exist.
 */
const getHeader = (
  headers: HeaderMap | undefined | null,
  nameLower: string,
): string | undefined => {
  if (!headers) return undefined;

  // Find the key in a case-insensitive manner.
  const key = Object.keys(headers).find((k) => k.toLowerCase() === nameLower);

  return key ? headers[key] : undefined;
};

/**
 * Detects the security context from an API Gateway event.
 *
 * @param event The API Gateway event.
 * @returns The security context.
 */
export const detectSecurityContext = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
): SecurityContext => {
  // Handle V1 (REST API) events first.
  if (isV1(event)) {
    const { identity, authorizer } = event.requestContext;

    // If an authorizer is present, it's an authenticated user request.
    if (authorizer) return 'my';

    // If an API key is present, it's a private request.
    if (identity.apiKeyId || identity.apiKey) return 'private';

    // Otherwise, it's a public request.
    return 'public';
  }

  // Handle V2 (HTTP API) events.
  const auth = getV2Authorizer(event.requestContext);

  // If an authorizer (JWT, IAM, or Lambda) is present, it's an authenticated user request.
  if (auth) return 'my';

  // For V2, API key usage often relies on checking for the 'x-api-key' header.
  const apiKey = getHeader(
    event.headers as
      | APIGatewayProxyEventHeaders
      | Record<string, string>
      | undefined,
    'x-api-key',
  );

  // If the API key header is found, it's a private request; otherwise, it's public.
  return apiKey ? 'private' : 'public';
};
