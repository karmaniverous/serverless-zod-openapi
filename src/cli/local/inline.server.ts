/**
 * Inline HTTP dev server (local backend).
 *
 * - Uses aws-lambda types; no local redeclarations of platform shapes.
 * - Builds a route table from app.buildAllServerlessFunctions().
 * - Maps Node HTTP → APIGatewayProxyEvent (v1) → handler → writes APIGatewayProxyResult.
 * - Normalizes headers/query; prints route table and chosen port.
 */

import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

import { app } from '@/app/config/app.config';

/**
 * Load downstream registers to populate the app registry.
 * This dynamically imports app/generated/register.functions.* from the
 * downstream project root (CWD). Running under tsx allows .ts/.mts.
 */
const loadRegisters = async (root: string): Promise<void> => {
  const candidates = [
    path.resolve(root, 'app', 'generated', 'register.functions.ts'),
    path.resolve(root, 'app', 'generated', 'register.functions.mts'),
    path.resolve(root, 'app', 'generated', 'register.functions.js'),
    path.resolve(root, 'app', 'generated', 'register.functions.mjs'),
  ];
  for (const p of candidates) {
    try {
      const url = pathToFileURL(p).href;
      await import(url);
      return;
    } catch {
      // try next candidate
    }
  }
  console.warn(
    '[inline] Could not load app/generated/register.functions.*. Run "npx smoz register" before inline dev.',
  );
};

type Route = {
  method: string; // UPPER
  pattern: string; // e.g., /users/{id}  segs: Array<{ literal?: string; key?: string }>;
  handlerRef: string; // module.export (from handler string)
  handler: (
    e: APIGatewayProxyEvent,
    c: Context,
  ) => Promise<APIGatewayProxyResult>;
};

const splitPattern = (p: string): Array<{ literal?: string; key?: string }> =>
  p
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean)
    .map((s) =>
      s.startsWith('{') && s.endsWith('}')
        ? { key: s.slice(1, -1) }
        : { literal: s },
    );

const loadHandlers = async (root: string): Promise<Route[]> => {
  const fns = app.buildAllServerlessFunctions() as Record<string, unknown>;
  const routes: Route[] = [];

  for (const [, defUnknown] of Object.entries(fns)) {
    const def = defUnknown as {
      handler?: string;
      events?: Array<{ http?: { method?: string; path?: string } }>;
    };

    if (typeof def.handler !== 'string' || !Array.isArray(def.events)) continue;

    const [moduleRel, exportName] = (() => {
      const lastDot = def.handler.lastIndexOf('.');
      if (lastDot < 0) return [def.handler, 'handler'] as const;
      return [
        def.handler.slice(0, lastDot),
        def.handler.slice(lastDot + 1),
      ] as const;
    })();

    // Resolve TS source module; dev runs via tsx so TS imports are OK
    const candidates = [
      path.resolve(root, `${moduleRel}.ts`),
      path.resolve(root, `${moduleRel}.mts`),
      path.resolve(root, `${moduleRel}.js`),
      path.resolve(root, `${moduleRel}.mjs`),
    ];
    const modUrl = pathToFileURL(candidates[0]!).href;
    // Always try the first candidate; tsx will resolve TS files

    const mod = (await import(modUrl)) as Record<string, unknown>;
    const handler = mod[exportName];
    if (typeof handler !== 'function') continue;

    for (const evt of def.events) {
      const httpEvt = (evt as { http?: { method?: string; path?: string } })
        .http;
      const method = (httpEvt?.method ?? '').toUpperCase();
      const pattern = '/' + (httpEvt?.path ?? '').replace(/^\/+/, '');
      if (!method || !pattern) continue;

      routes.push({
        method,
        pattern,
        segs: splitPattern(pattern),
        handlerRef: `${moduleRel}.${exportName}`,
        handler: handler as Route['handler'],
      });
    }
  }

  return routes;
};

const firstVal = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;
const arrVal = (v: string | string[] | undefined): string[] | undefined =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v : undefined;

const toHeaders = (
  raw: http.IncomingHttpHeaders,
): { single: Record<string, string>; multi: Record<string, string[]> } => {
  const single: Record<string, string> = {};
  const multi: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(raw)) {
    const fv = firstVal(v);
    const av = arrVal(v);
    if (typeof fv === 'string') single[k] = fv;
    if (Array.isArray(av)) multi[k] = av;
  }
  return { single, multi };
};

const readBody = (req: http.IncomingMessage): Promise<string> =>
  new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) =>
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(String(c))),
    );
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', () => {
      resolve('');
    });
  });

const now = () => Date.now();

const makeContext = (): Context =>
  ({
    awsRequestId: String(now()),
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'inline',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:inline',
    logGroupName: 'lg',
    logStreamName: 'ls',
    memoryLimitInMB: '256',
    getRemainingTimeInMillis: () => 30000,
    done: () => undefined,
    fail: () => undefined,
    succeed: () => undefined,
  }) as unknown as Context;

const match = (
  segs: Route['segs'],
  pathName: string,
): { ok: boolean; params: Record<string, string> } => {
  const parts = pathName
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);
  if (parts.length !== segs.length) return { ok: false, params: {} };
  const params: Record<string, string> = {};
  for (let i = 0; i < segs.length; i += 1) {
    const seg = segs[i]!;
    const p = parts[i]!;
    if (seg.literal) {
      if (seg.literal !== p) return { ok: false, params: {} };
    } else if (seg.key) {
      params[seg.key] = p;
    }
  }
  return { ok: true, params };
};

const toEvent = async (
  req: http.IncomingMessage,
  route: Route,
  params: Record<string, string>,
): Promise<APIGatewayProxyEvent> => {
  const url = new URL(
    req.url ?? '/',
    `http://${req.headers.host ?? 'localhost'}`,
  );
  const { single, multi } = toHeaders(req.headers);
  const method = (req.method ?? '').toUpperCase();
  const stage = process.env.SMOZ_STAGE ?? 'dev';
  const search = new URLSearchParams(url.search);
  const query: Record<string, string> = {};
  const mquery: Record<string, string[]> = {};
  for (const key of Array.from(new Set(search.keys()))) {
    const vals = search.getAll(key);
    if (vals.length > 0) {
      query[key] = vals[0]!;
      mquery[key] = vals;
    }
  }

  let body = '';
  if (method !== 'GET' && method !== 'HEAD') {
    body = await readBody(req);
  }

  return {
    httpMethod: method,
    headers: single,
    multiValueHeaders: multi,
    body,
    isBase64Encoded: false,
    path: url.pathname,
    queryStringParameters: Object.keys(query).length ? query : {},
    multiValueQueryStringParameters: Object.keys(mquery).length ? mquery : {},
    pathParameters: Object.keys(params).length ? params : {},
    stageVariables: null,
    resource: route.pattern,
    requestContext: {
      accountId: 'acc',
      apiId: 'inline',
      httpMethod: method,
      identity: {},
      path: url.pathname,
      stage,
      requestId: String(now()),
      requestTimeEpoch: now(),
      resourceId: 'res',
      resourcePath: route.pattern,
      authorizer: {},
      protocol: 'HTTP/1.1',
    } as unknown,
  } as unknown as APIGatewayProxyEvent;
};

const writeResult = (
  res: http.ServerResponse,
  result: APIGatewayProxyResult,
) => {
  const status =
    typeof result.statusCode === 'number' ? result.statusCode : 200;
  const headers = result.headers ?? {};
  const body = typeof result.body === 'string' ? result.body : '';
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === 'string') res.setHeader(k, v);
  }
  res.statusCode = status;
  res.end(body);
};

const start = async () => {
  const root = process.cwd();
  // Ensure register side-effects are loaded so the registry has routes
  await loadRegisters(root);
  const routes = await loadHandlers(root);
  const portEnv = process.env.SMOZ_PORT;
  const port =
    typeof portEnv === 'string' && portEnv.length > 0 ? Number(portEnv) : 0;

  const server = http.createServer((req, res) => {
    void (async () => {
      try {
        const method = (req.method ?? '').toUpperCase();
        const url = new URL(
          req.url ?? '/',
          `http://${req.headers.host ?? 'localhost'}`,
        );
        // Allow HEAD to match GET routes; the wrapped handler/middleware will
        // short-circuit HEAD requests to 200 {} and set Content-Type.
        const searchMethod = method === 'HEAD' ? 'GET' : method;
        const route = routes.find(
          (r) => r.method === searchMethod && match(r.segs, url.pathname).ok,
        );
        if (!route) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Not Found' }));
          return;
        }
        const { params } = match(route.segs, url.pathname);
        const evt = await toEvent(req, route, params);
        const ctx = makeContext();
        const result = await route.handler(evt, ctx);
        writeResult(res, result);
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: (e as Error).message }));
      }
    })();
  });

  server.listen(port, () => {
    const addr = server.address();
    const resolved =
      typeof addr === 'object' && addr && 'port' in addr
        ? (addr as { port: number }).port
        : port;

    // Print route table
    console.log('[inline] listening on http://localhost:' + String(resolved));
    console.log(
      '[inline] routes:\n' +
        routes
          .map(
            (r) =>
              '  ' +
              r.method.padEnd(6) +
              ' ' +
              r.pattern +
              '  ->  ' +
              r.handlerRef,
          )
          .join('\n'),
    );
  });
};

// Start immediately when run via tsx
void start();
