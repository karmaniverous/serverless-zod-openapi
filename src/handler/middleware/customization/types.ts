/**
 + HTTP customization types and aliases.
 */
import type { MiddlewareObj } from '@middy/core';
import type httpContentNegotiation from '@middy/http-content-negotiation';
import type httpCors from '@middy/http-cors';
import type httpErrorHandler from '@middy/http-error-handler';
import type httpHeaderNormalizer from '@middy/http-header-normalizer';
import type httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger } from '@/src/types/Loggable';

import type { HttpTransform, PhasedArrays } from '../transformUtils';

export type ApiMiddleware = MiddlewareObj<APIGatewayProxyEvent, Context>;

export type HttpStackOptions = {
  contentType?: string; // default 'application/json'
  logger?: ConsoleLogger;
  contentNegotiation?: Parameters<typeof httpContentNegotiation>[0];
  cors?: Parameters<typeof httpCors>[0];
  errorHandler?: Parameters<typeof httpErrorHandler>[0];
  serializer?: {
    json?: { label?: string; stringify?: (value: unknown) => string };
  };
  jsonBodyParser?: Parameters<typeof httpJsonBodyParser>[0];
  headerNormalizer?: Parameters<typeof httpHeaderNormalizer>[0];
};

export type Extend = {
  before?: ApiMiddleware[];
  after?: ApiMiddleware[];
  onError?: ApiMiddleware[];
};

export type HttpProfile = HttpStackOptions & {
  extend?: Extend;
  transform?: HttpTransform;
};

export type AppHttpConfig = {
  defaults?: HttpStackOptions & { extend?: Extend; transform?: HttpTransform };
  profiles?: Record<string, HttpProfile>;
};

export type FunctionHttpConfig = {
  profile?: string;
  options?: Partial<HttpStackOptions>;
  extend?: Extend;
  transform?: HttpTransform;
  replace?: { stack: MiddlewareObj | PhasedArrays };
};
/** Optional Zod type used by step builders. */
export type Zodish = z.ZodType | undefined;
