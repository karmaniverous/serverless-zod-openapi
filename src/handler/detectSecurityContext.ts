import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';

export const isV1 = (evt: unknown): evt is APIGatewayProxyEvent => {
  if (!evt || typeof evt !== 'object') return false;
  const obj = evt as Record<string, unknown>;
  if (!('httpMethod' in obj) || !('requestContext' in obj)) return false;
  const ctx = (obj as { requestContext?: unknown }).requestContext;
  return (
    !!ctx &&
    typeof ctx === 'object' &&
    'identity' in (ctx as Record<string, unknown>)
  );
};

export const isV2 = (evt: unknown): evt is APIGatewayProxyEventV2 => {
  if (!evt || typeof evt !== 'object') return false;
  const obj = evt as Record<string, unknown>;
  // V2 has 'version' and requestContext.http (not identity)
  if (!('version' in obj) || !('requestContext' in obj)) return false;
  const ctx = (obj as { requestContext?: unknown }).requestContext;
  return (
    !!ctx &&
    typeof ctx === 'object' &&
    'http' in (ctx as Record<string, unknown>)
  );
};

export type SecurityContext =
  | { version: 'v1'; identity: unknown }
  | { version: 'v2'; http: unknown }
  | { version: 'none' };

export const detectSecurityContext = (evt: unknown): SecurityContext => {
  if (isV1(evt))
    return { version: 'v1', identity: evt.requestContext.identity };
  if (isV2(evt)) return { version: 'v2', http: evt.requestContext.http };
  return { version: 'none' };
};

