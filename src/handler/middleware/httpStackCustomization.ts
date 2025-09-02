/**
 * HTTP Middleware Customization
 *
 * Requirements implemented:
 * - Default pipeline with stable Step IDs (before/after/onError).
 * - App-level defaults/profiles; function-level options/extend/transform/replace.
 * - Merge order and invariants validation.
 * - Zod enforcement when schemas are present (schemas provided ⇒ validation required).
 * - Transform helpers interop and tagging custom steps by __id.
 *
 * Notes:
 * - Serializer remains last in after; shape precedes serializer; head is first in before.
 * - error-handler appears only in onError.
 * - Tagging helper lives in transformUtils (tagStep/getId).
 */
import type { MiddlewareObj } from '@middy/core';
import httpContentNegotiation from '@middy/http-content-negotiation';
import httpCors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpResponseSerializer from '@middy/http-response-serializer';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import { asApiMiddleware } from '@/src/handler/middleware/asApiMiddleware';
import { combine } from '@/src/handler/middleware/combine';
import { httpZodValidator } from '@/src/handler/middleware/httpZodValidator';
import { shortCircuitHead } from '@/src/handler/middleware/shortCircuitHead';
import { wrapSerializer } from '@/src/handler/wrapSerializer';
import type { ConsoleLogger } from '@/src/types/Loggable';

import {
  assertInvariants,
  getId,
  type HttpTransform,
  type PhasedArrays,
  tagStep,
} from './transformUtils';

type M = MiddlewareObj<APIGatewayProxyEvent, Context>;

export type HttpStackOptions = {
  contentType?: string; // default 'application/json'
  logger?: ConsoleLogger;
  contentNegotiation?: Parameters<typeof httpContentNegotiation>[0];
  cors?: Parameters<typeof httpCors>[0];
  errorHandler?: Parameters<typeof httpErrorHandler>[0];
  serializer?: { json?: { label?: string; stringify?: (value: unknown) => string } };
  jsonBodyParser?: Parameters<typeof httpJsonBodyParser>[0];
  headerNormalizer?: Parameters<typeof httpHeaderNormalizer>[0];
};

export type Extend = {
  before?: M[];
  after?: M[];
  onError?: M[];
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

/** Internal helpers to build default steps with IDs */
const makeHead = (): M => tagStep(shortCircuitHead as M, 'head');

const makeHeaderNormalizer = (opts?: HttpStackOptions): M =>
  tagStep(asApiMiddleware(httpHeaderNormalizer(opts?.headerNormalizer ?? { canonical: true })), 'header-normalizer');

const makeEventNormalizer = (): M =>
  tagStep(asApiMiddleware(httpEventNormalizer()), 'event-normalizer');

const makeContentNegotiation = (contentType: string, opts?: HttpStackOptions): M => {
  const defaults = {
    parseLanguages: false,
    parseCharsets: false,
    parseEncodings: false,
    availableMediaTypes: [contentType],
  } as const;
  const merged = { ...defaults, ...(opts?.contentNegotiation ?? {}) };
  return tagStep(asApiMiddleware(httpContentNegotiation(merged)), 'content-negotiation');
};

const makeJsonBodyParser = (opts?: HttpStackOptions): M => {
  const inner = asApiMiddleware(
    httpJsonBodyParser({ disableContentTypeError: true, ...(opts?.jsonBodyParser ?? {}) }),
  );
  const mw: M = {
    before: async (request) => {
      const event = (request as unknown as { event?: APIGatewayProxyEvent }).event;
      if (!event) return;
      const method = (
        event.httpMethod ||
        (event as unknown as { requestContext?: { http?: { method?: string } } }).requestContext?.http?.method ||
        ''
      ).toUpperCase();
      if (method === 'GET' || method === 'HEAD') return;
      if (!event.body) return;
      if (inner.before) await inner.before(request);
    },
  };
  return tagStep(mw, 'json-body-parser');
};

const makeZodBefore = (
  logger: ConsoleLogger,
  eventSchema?: z.ZodType  ,
): M => {
  const base = httpZodValidator({ logger, ...(eventSchema ? { eventSchema } : {}) });
  const mw: M = { before: base.before };
  return tagStep(mw, 'zod-before');
};

const makeZodAfter = (
  logger: ConsoleLogger,
  responseSchema?: z.ZodType  ,
): M => {
  const base = httpZodValidator({ logger, ...(responseSchema ? { responseSchema } : {}) });
  const mw: M = { after: base.after };
  return tagStep(mw, 'zod-after');
};

const makeHeadFinalize = (contentType: string): M =>
  tagStep(
    {
      after: (request) => {
        const evt = (request as unknown as { event?: APIGatewayProxyEvent }).event;
        if (!evt) return;
        const method = (
          evt.httpMethod ||
          (evt as unknown as { requestContext?: { http?: { method?: string } } }).requestContext?.http?.method ||
          ''
        ).toUpperCase();
        if (method !== 'HEAD') return;
        (request as unknown as { response: { statusCode: number; headers?: Record<string, string>; body?: unknown } }).response =
          { statusCode: 200, headers: { 'Content-Type': contentType }, body: {} };
      },
    },
    'head-finalize',
  );

const makePreferredMedia = (contentType: string): M =>
  tagStep(
    {
      before: (request) => {
        const req = request as { preferredMediaTypes?: string[] };
        if (!Array.isArray(req.preferredMediaTypes)) req.preferredMediaTypes = [contentType];
        const ri = request as { internal?: Record<string, unknown> };
        if (!ri.internal) ri.internal = {};
        const internal = ri.internal as { preferredMediaTypes?: string[] };
        if (!Array.isArray(internal.preferredMediaTypes)) internal.preferredMediaTypes = [contentType];
      },
      after: (request) => {
        const req = request as { preferredMediaTypes?: string[] };
        if (!Array.isArray(req.preferredMediaTypes)) req.preferredMediaTypes = [contentType];
      },
      onError: (request) => {
        const req = request as { preferredMediaTypes?: string[] };
        if (!Array.isArray(req.preferredMediaTypes)) req.preferredMediaTypes = [contentType];
      },
    },
    'preferred-media',
  );

const makeErrorExpose = (logger: ConsoleLogger): M =>
  tagStep(
    {
      onError: (request) => {
        void logger; // for symmetry; logger used downstream
        const maybe = (request as { error?: unknown }).error;
        if (!(maybe instanceof Error)) return;
        const msg = typeof maybe.message === 'string' ? maybe.message : '';
        (maybe as { expose?: boolean }).expose = true;
        if (
          typeof (maybe as { statusCode?: unknown }).statusCode !== 'number' &&
          ((typeof (maybe as { name?: unknown }).name === 'string' &&
            (maybe as { name: string }).name.toLowerCase().includes('zod')) ||
            /invalid (event|response)/i.test(msg))
        ) {
          (maybe as { statusCode?: number }).statusCode = 400;
        }
      },
    },
    'error-expose',
  );

const makeErrorHandler = (opts?: HttpStackOptions): M =>
  tagStep(
    asApiMiddleware(
      httpErrorHandler({
        ...(opts?.errorHandler ?? {}),
        logger: (o) => {
          const lg = (opts?.logger ?? console);
          if (typeof lg.error === 'function') lg.error(o);
        },
      }),
    ),
    'error-handler',
  );

const makeCors = (opts?: HttpStackOptions): M =>
  tagStep(
    asApiMiddleware(
      httpCors({
        credentials: true,
        getOrigin: (o) => o,
        ...(opts?.cors ?? {}),
      }),
    ),
    'cors',
  );

const makeShapeAndContentType = (contentType: string): M =>
  tagStep(
    {
      after: (request) => {
        const container = request as unknown as { response?: unknown };
        const current = container.response;
        if (current === undefined) return;
        const looksShaped =
          typeof current === 'object' &&
          current !== null &&
          'statusCode' in (current as Record<string, unknown>) &&
          'headers' in (current as Record<string, unknown>) &&
          'body' in (current as Record<string, unknown>);
        let res: { statusCode: number; headers?: Record<string, string>; body?: unknown };
        if (looksShaped) res = current as { statusCode: number; headers?: Record<string, string>; body?: unknown };
        else res = { statusCode: 200, headers: {}, body: current };
        if (res.body !== undefined && typeof res.body !== 'string') {
          try {
            res.body = JSON.stringify(res.body);
          } catch {
            res.body = String(res.body);
          }
        }
        const headers = res.headers ?? {};
        headers['Content-Type'] = contentType;
        res.headers = headers;
        (request as unknown as { response: typeof res }).response = res;
      },
    },
    'shape',
  );

const makeSerializer = (contentType: string, opts?: HttpStackOptions): M =>
  tagStep(
    asApiMiddleware(
      httpResponseSerializer({
        serializers: [
          {
            regex: /^application\/(?:[a-z0-9.+-]*\+)?json$/i,
            serializer: wrapSerializer(
              ({ body }) =>
                typeof body === 'string'
                  ? body
                  : (opts?.serializer?.json?.stringify ?? JSON.stringify)(body),
              {
                label: opts?.serializer?.json?.label ?? 'json',
                logger: (opts?.logger ?? console),
              },
            ),
          },
        ],
        defaultContentType: contentType,
      }),
    ),
    'serializer',
  );

/** Build the default phased pipeline with IDs applied. */
const buildDefaultPhases = (args: {
  contentType: string;
  logger: ConsoleLogger;
  opts?: HttpStackOptions;
  eventSchema?: z.ZodType | undefined;
  responseSchema?: z.ZodType | undefined;
}): { before: M[]; after: M[]; onError: M[] } => {
  const { contentType, logger, opts, eventSchema, responseSchema } = args;
  const before: M[] = [
    makeHead(),
    makeHeaderNormalizer(opts),
    makeEventNormalizer(),
    makeContentNegotiation(contentType, opts),
    makeJsonBodyParser(opts),
    makeZodBefore(logger, eventSchema),
  ];
  const after: M[] = [
    makeHeadFinalize(contentType),
    makeZodAfter(logger, responseSchema),
    makeErrorExpose(logger),
    makeCors(opts),
    makePreferredMedia(contentType),
    makeShapeAndContentType(contentType),
    makeSerializer(contentType, opts),
  ];
  const onError: M[] = [makeErrorExpose(logger), makeErrorHandler(opts)];
  return { before, after, onError };
};

/** Shallow merge HttpStackOptions left→right. */
const mergeOptions = (
  a?: Partial<HttpStackOptions>,
  b?: Partial<HttpStackOptions>,
): HttpStackOptions => ({ ...(a ?? {}), ...(b ?? {}) });

/** Apply extend lists (append in order) */
const applyExtend = (phases: { before: M[]; after: M[]; onError: M[] }, ext?: Extend) => {
  if (!ext) return phases;
  if (ext.before?.length) phases.before = [...phases.before, ...ext.before];
  if (ext.after?.length) phases.after = [...phases.after, ...ext.after];
  if (ext.onError?.length) phases.onError = [...phases.onError, ...ext.onError];
};

/** Apply transform callback and validate invariants. */
const applyTransform = (
  phases: { before: M[]; after: M[]; onError: M[] },
  transform?: HttpTransform,
) => {
  if (!transform) return phases;
  const next = transform({
    before: phases.before.slice(),
    after: phases.after.slice(),
    onError: phases.onError.slice(),
  });
  const out = {
    before: next.before ?? phases.before,
    after: next.after ?? phases.after,
    onError: next.onError ?? phases.onError,
  };
  // Validate invariants and illegal placements
  assertInvariants(out);
  return out;
};

/** Zod enforcement per spec. */
const enforceZod = (
  phases: { before: M[]; after: M[]; onError: M[] },
  hasSchemas: boolean,
  fnName: string,
): void => {
  if (!hasSchemas) return;
  const hasBefore = phases.before.some((m) => getId(m) === 'zod-before');
  const hasAfter = phases.after.some((m) => getId(m) === 'zod-after');
  if (!hasBefore || !hasAfter) {
    throw new Error(
      `Zod validation is required (schemas provided) but is missing after stack customization on function '${fnName}'. ` +
        `Include the standard httpZodValidator or tag your custom validator steps as 'zod-before' and 'zod-after'.`,
    );
  }
};

/** Compute final stack given app-level and function-level customization. */
export const computeHttpMiddleware = (args: {
  functionName: string;
  eventSchema?: z.ZodType | undefined;
  responseSchema?: z.ZodType | undefined;
  logger?: ConsoleLogger;
  // base defaults from function config for content type
  contentType?: string;
  app?: AppHttpConfig;
  fn?: FunctionHttpConfig;
}): MiddlewareObj<APIGatewayProxyEvent, Context> => {
  const {
    functionName,
    eventSchema,
    responseSchema,
    logger: maybeLogger,
    contentType: maybeContentType,
    app,
    fn,
  } = args;
  // Resolve options layering
  const baseContentType = (maybeContentType ?? 'application/json').toLowerCase();
  let effective: HttpStackOptions = {
    contentType: baseContentType,
    logger: maybeLogger ?? console,
  };

  // Layer A: app.defaults.options
  effective = mergeOptions(effective, app?.defaults);
  // Apply profile (options)
  const profile = fn?.profile ? app?.profiles?.[fn.profile] : undefined;
  effective = mergeOptions(effective, profile);
  // Function-level options
  effective = mergeOptions(effective, fn?.options);

  const contentType = (effective.contentType ?? baseContentType).toLowerCase();
  const logger = (effective.logger ?? console);

  // Build default phases with resolved options
  let phases = buildDefaultPhases({
    contentType,
    logger,
    opts: effective,
    eventSchema,
    responseSchema,
  });

  // Layer B: extend (app.defaults → profile → function)
  applyExtend(phases, (app?.defaults as { extend?: Extend } | undefined)?.extend);
  applyExtend(phases, profile?.extend);
  applyExtend(phases, fn?.extend);

  // Layer C: transform (app.defaults → profile → function)
  phases = applyTransform(
    phases,
    (app?.defaults as { transform?: HttpTransform } | undefined)?.transform,
  );
  phases = applyTransform(phases, profile?.transform);
  phases = applyTransform(phases, fn?.transform);

  // Invariants (pre-replace)
  assertInvariants(phases);

  // Zod enforcement (pre-replace)
  enforceZod(phases, !!(eventSchema || responseSchema), functionName);

  // Layer D: replace (full override)
  if (fn?.replace?.stack) {
    const rep = fn.replace.stack;
    if (typeof rep === 'object' && 'before' in (rep as Record<string, unknown>)) {
      const p = rep as PhasedArrays;
      const final = {
        before: p.before ?? [],
        after: p.after ?? [],
        onError: p.onError ?? [],
      };
      assertInvariants(final);
      enforceZod(final, !!(eventSchema || responseSchema), functionName);
      return combine(...final.before, ...final.after, ...final.onError);
    }
    // Single middleware replacement: cannot validate presence of zod steps.
    if (eventSchema || responseSchema) {
      throw new Error(
        `Full replace provided as a single middleware object on function '${functionName}', but schemas are present. ` +
          `To satisfy Zod enforcement, provide phased arrays including steps tagged as 'zod-before' and 'zod-after'.`,
      );
    }
    return rep as MiddlewareObj<APIGatewayProxyEvent, Context>;
  }

  // Compose final combined stack
  return combine(...phases.before, ...phases.after, ...phases.onError);
};

// Re-export helpers for ergonomics
export {
  getId,
  type HttpTransform,
  type PhasedArrays,
  tagStep,
} from './transformUtils';
