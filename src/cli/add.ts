/**
 * SMOZ CLI: add
 *
 * Scaffold a function under app/functions.
 * Usage spec:
 * - HTTP:    <eventType>/<segments...>/<method>
 * - non-HTTP:<eventType>/<segments...>
 *
 * Creates:
 * - HTTP: lambda.ts, handler.ts, openapi.ts
 * - non-HTTP: lambda.ts, handler.ts
 *
 * Idempotent and formatted (uses Prettier if available).
 */
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { dirname, join, posix, sep } from 'node:path';

const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'head',
  'options',
  'trace',
]);

const toPosix = (p: string): string => p.split(sep).join('/');

const formatMaybe = async (root: string, filePath: string, source: string) => {
  try {
    const prettier = (await import('prettier')) as unknown as {
      resolveConfig: (p: string) => Promise<Record<string, unknown> | null>;
      format: (s: string, o: Record<string, unknown>) => string;
    };
    const cfg = (await prettier.resolveConfig(root)) ?? {};
    return prettier.format(source, { ...cfg, filepath: filePath });
  } catch {
    return source;
  }
};

const writeIfAbsent = async (outFile: string, content: string): Promise<{
  created: boolean;
}> => {
  if (existsSync(outFile)) return { created: false };
  await fs.mkdir(dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, content, 'utf8');
  return { created: true };
};

const lambdaHttpTemplate = ({
  token,
  basePath,
  method,
}: {
  token: string;
  basePath: string;
  method: string;
}) => `/**
 * Registration: ${method.toUpperCase()} /${basePath} (public)
 */
import { join } from 'node:path';

import { z } from 'zod';

import { app, APP_ROOT_ABS } from '@/app/config/app.config';

export const eventSchema = z.any();
export const responseSchema = z.any();

export const fn = app.defineFunction({
  eventType: '${token}',
  httpContexts: ['public'],
  method: '${method}',
  basePath: '${basePath}',
  contentType: 'application/json',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: join(APP_ROOT_ABS, 'functions', '${token}').replace(/\\\\\\\\/g, '/'),
});
`;

const handlerHttpTemplate = () => `/**
 * Handler: replace with your business logic.
 */
import { z } from 'zod';

import type { responseSchema } from './lambda';
import { fn } from './lambda';

type Response = z.infer<typeof responseSchema>;

export const handler = fn.handler(async (): Promise<Response> => {
  return {} as Response;
});
`;

const openapiTemplate = () => `/* REQUIREMENTS
- Define OpenAPI Path Item for the new endpoint.
*/
import { eventSchema, fn, responseSchema } from './lambda';

fn.openapi({
  summary: 'Describe your endpoint',
  description: 'Describe your endpoint.',
  requestBody: {
    description: 'Request payload.',
    content: { 'application/json': { schema: eventSchema } },
  },
  responses: {
    200: {
      description: 'Ok',
      content: { 'application/json': { schema: responseSchema } },
    },
  },
  tags: [],
});

export {};
`;

const lambdaInternalTemplate = (token: string) => `/**
 * Registration: internal ${token} function.
 */
import { join } from 'node:path';

import { z } from 'zod';

import { app, APP_ROOT_ABS } from '@/app/config/app.config';

export const eventSchema = z.any();
export const responseSchema = z.any();

export const fn = app.defineFunction({
  eventType: '${token}',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: join(APP_ROOT_ABS, 'functions', '${token}').replace(/\\\\\\\\/g, '/'),
});
`;

const handlerInternalTemplate = () => `/**
 * Handler: replace with your business logic.
 */
import { z } from 'zod';

import type { responseSchema } from './lambda';
import { fn } from './lambda';

type Response = z.infer<typeof responseSchema>;

export const handler = fn.handler(async (_event): Promise<Response> => {
  void _event;
  return {} as Response;
});
`;

export const runAdd = async (
  root: string,
  spec: string,
): Promise<{ created: string[]; skipped: string[] }> => {
  const parts = spec.split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new Error(
      'Invalid spec. Use <eventType>/<segments...>/<method> (HTTP) or <eventType>/<segments...> (non-HTTP).',
    );
  }
  const token = parts[0]!.toLowerCase();
  const tail = parts[parts.length - 1]!.toLowerCase();
  const isHttp = HTTP_METHODS.has(tail);

  const baseParts = isHttp ? parts.slice(1, -1) : parts.slice(1);
  if (baseParts.length === 0) {
    throw new Error('Provide at least one path segment after the eventType.');
  }
  const method = isHttp ? tail : undefined;
  const basePathPosix = toPosix(baseParts.join('/'));

  const dir = join(root, 'app', 'functions', token, ...baseParts, ...(method ? [method] : []));
  const lambdaPath = join(dir, 'lambda.ts');
  const handlerPath = join(dir, 'handler.ts');
  const openapiPath = join(dir, 'openapi.ts');

  // Compute contents
  const files: Array<{ path: string; content: string; enabled: boolean }> = [];
  if (isHttp) {
    files.push({
      path: lambdaPath,
      content: lambdaHttpTemplate({ token, basePath: basePathPosix, method: method! }),
      enabled: true,
    });
    files.push({ path: handlerPath, content: handlerHttpTemplate(), enabled: true });
    files.push({ path: openapiPath, content: openapiTemplate(), enabled: true });
  } else {
    files.push({ path: lambdaPath, content: lambdaInternalTemplate(token), enabled: true });
    files.push({ path: handlerPath, content: handlerInternalTemplate(), enabled: true });
    files.push({ path: openapiPath, content: '', enabled: false });
  }

  const created: string[] = [];
  const skipped: string[] = [];
  for (const f of files) {
    if (!f.enabled) continue;
    const formatted = await formatMaybe(root, f.path, f.content);
    const { created: c } = await writeIfAbsent(f.path, formatted);
    if (c) created.push(posix.normalize(f.path));
    else skipped.push(posix.normalize(f.path));
  }

  return { created, skipped };
};
