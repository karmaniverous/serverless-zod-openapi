/* Inline HTTP dev server (run via tsx)
 * - Discovers HTTP routes from app.buildAllServerlessFunctions().
 * - For each route, maps Node HTTP request → APIGatewayProxyEvent (v1) and invokes the handler.
 * - Prints the route table and the actual port in use.
 */
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { packageDirectorySync } from 'package-directory';

type HttpEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  multiValueHeaders: Record<string, string[] | undefined>;
  body: string | undefined;
  isBase64Encoded: boolean;
  path: string;
  queryStringParameters: Record<string, string | undefined>;
  pathParameters: Record<string, string | undefined>;
  multiValueQueryStringParameters: Record<string, string[] | undefined>;
  stageVariables: Record<string, string> | null;
  resource: string;
  requestContext: Record<string, unknown>;
};

type HttpResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
};

const SMOZ_PORT = Number(process.env.SMOZ_PORT ?? '0');
const SMOZ_STAGE = process.env.SMOZ_STAGE ?? 'dev';
const SMOZ_VERBOSE = !!process.env.SMOZ_VERBOSE;

const repoRoot = packageDirectorySync() ?? process.cwd();

const importApp = async () => {
  const appConfigTs = path.resolve(repoRoot, 'app', 'config', 'app.config.ts');
  if (!existsSync(appConfigTs)) {
    throw new Error('app/config/app.config.ts not found');
  }
  const mod = await import(pathToFileURL(appConfigTs).href);
  const app = mod.app as {
    buildAllServerlessFunctions: () => Record<
      string,
      { events: Array<{ http?: { method: string; path: string } }>; handler: string }
    >;
  };
  if (!app || typeof app.buildAllServerlessFunctions !== 'function') {
    throw new Error('app.config.ts did not export a valid app instance');
  }
  return app;
};

const compilePath = (pattern: string): { re: RegExp; keys: string[]; raw: string } => {
  // Convert '/users/{id}' to /^\/users\/(?<id>[^/]+)$/
  const keys: string[] = [];
  const esc = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const segs = pattern.split('/').filter(Boolean);
  const out = segs
    .map((seg) => {
      const m = seg.match(/^\{([^}]+)\}$/);
      if (m) {
        const k = m[1]!;
        keys.push(k);
        return `(?<${k}>[^/]+)`;
      }
      return esc(seg);
    })
    .join('/');
  const re = new RegExp(`^/${out}$`);
  return { re, keys, raw: pattern };
};

const toLowerHeaders = (h: http.IncomingHttpHeaders): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) {
    if (Array.isArray(v)) {
      if (v.length) out[k.toLowerCase()] = v[0]!;
    } else if (typeof v === 'string') {
      out[k.toLowerCase()] = v;
    }
  }
  return out;
};

const parseQuery = (url: URL): {
  single: Record<string, string | undefined>;
  multi: Record<string, string[] | undefined>;
} => {
  const single: Record<string, string | undefined> = {};
  const multi: Record<string, string[] | undefined> = {};
  url.searchParams.forEach((value, key) => {
    if (single[key] === undefined) single[key] = value;
    const all = url.searchParams.getAll(key);
    if (all.length) multi[key] = all;
  });
  return { single, multi };
};

const importHandler = async (handler: string): Promise<(evt: HttpEvent) => Promise<HttpResponse>> => {
  // handler example: 'app/functions/rest/openapi/get/handler.handler'
  const idx = handler.lastIndexOf('.');
  if (idx < 0) throw new Error(`Invalid handler string: ${handler}`);
  const rel = handler.slice(0, idx);
  const exportName = handler.slice(idx + 1);
  const absNoExt = path.resolve(repoRoot, rel);
  const tryPaths = [
    `${absNoExt}.ts`,
    `${absNoExt}.mts`,
    `${absNoExt}.js`,
    `${absNoExt}.mjs`,
    absNoExt, // let tsx try resolving if possible
  ];
  let mod: Record<string, unknown> | undefined;
  for (const p of tryPaths) {
    try {
      if (existsSync(p) || p === absNoExt) {
        mod = await import(pathToFileURL(p).href);
        break;
      }
    } catch {
      // continue
    }
  }
  if (!mod) throw new Error(`Cannot resolve module for handler: ${handler}`);
  const fn = (mod as Record<string, unknown>)[exportName];
  if (typeof fn !== 'function') {
    throw new Error(`Export "${exportName}" not found in ${rel}`);
  }
  return fn as (evt: HttpEvent) => Promise<HttpResponse>;
};

const main = async (): Promise<void> => {
  const app = await importApp();
  const fns = app.buildAllServerlessFunctions() as Record<
    string,
    { events: Array<{ http?: { method: string; path: string } }>; handler: string }
  >;
  type Route = {
    method: string;
    pattern: string;
    re: RegExp;
    keys: string[];
    handler: (evt: HttpEvent) => Promise<HttpResponse>;
  };
  const routes: Route[] = [];
  for (const [, def] of Object.entries(fns)) {
    const { events, handler } = def;
    for (const e of events) {
      if (!e.http) continue;
      const method = String(e.http.method || '').toUpperCase();
      const pattern = String(e.http.path || '/');
      const { re, keys } = compilePath(pattern);
      const h = await importHandler(handler);
      routes.push({ method, pattern, re, keys, handler: h });
    }
  }

  const server = http.createServer(async (req, res) => {
    try {
      const method = String(req.method || '').toUpperCase();
      const url = new URL(req.url ?? '/', `http://localhost`);
      const pathname = url.pathname;
      const match = routes.find((r) => r.method === method && r.re.test(pathname));
      if (!match) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Not found');
        return;
      }
      const m = match.re.exec(pathname);
      const params: Record<string, string | undefined> = {};
      if (m && m.groups) {
        for (const k of match.keys) params[k] = m.groups[k];
      }
      // Collect body
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        req.on('end', () => resolve());
        req.on('error', (e) => reject(e));
      });
      const raw = Buffer.concat(chunks);
      const lower = toLowerHeaders(req.headers);
      const contentType = lower['content-type'] ?? '';
      const isText =
        /^text\//i.test(contentType) ||
        /^application\/(?:json|[a-z0-9.+-]*\+json)$/i.test(contentType) ||
        contentType.length === 0;
      const bodyStr = raw.length ? (isText ? raw.toString('utf8') : raw.toString('base64')) : undefined;
      const isBase64Encoded = raw.length > 0 && !isText;
      const { single: qs, multi: qsm } = parseQuery(url);

      const evt: HttpEvent = {
        httpMethod: method,
        headers: lower,
        multiValueHeaders: Object.fromEntries(
          Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v : v ? [v] : undefined]),
        ),
        body: bodyStr,
        isBase64Encoded,
        path: pathname,
        queryStringParameters: qs,
        pathParameters: params,
        multiValueQueryStringParameters: qsm,
        stageVariables: null,
        resource: pathname,
        requestContext: {
          accountId: 'local',
          apiId: 'local',
          httpMethod: method,
          identity: {},
          path: pathname,
          stage: SMOZ_STAGE,
          requestId: 'local',
          requestTimeEpoch: Date.now(),
          resourceId: 'local',
          resourcePath: pathname,
          authorizer: {},
          protocol: 'HTTP/1.1',
        },
      };
      const resp = await match.handler(evt);
      res.statusCode = resp?.statusCode ?? 200;
      const headers = resp?.
