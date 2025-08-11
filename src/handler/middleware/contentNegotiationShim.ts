import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

/**
 * http-response-serializer expects `request.preferredMediaTypes` to exist when
 * @middy/http-content-negotiation is present. We don't want that extra runtime
 * dep right now, so we provide a tiny shim that ensures a sane default.
 */
export const contentNegotiationShim = (
  defaultType: string,
): MiddlewareObj<APIGatewayProxyEvent, Context> => ({
  before: (request) => {
    (
      request as unknown as { preferredMediaTypes?: string[] }
    ).preferredMediaTypes ??= [defaultType];
  },
  after: (request) => {
    (
      request as unknown as { preferredMediaTypes?: string[] }
    ).preferredMediaTypes ??= [defaultType];
  },
  onError: (request) => {
    (
      request as unknown as { preferredMediaTypes?: string[] }
    ).preferredMediaTypes ??= [defaultType];
  },
});
