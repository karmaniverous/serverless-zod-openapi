import { join } from 'node:path';

import { app, APP_ROOT_ABS } from '@/app/config/app.config';
import { toPosixPath } from '@karmaniverous/smoz';
import { z } from 'zod';

export const eventSchema = z.object({}).optional();
export const responseSchema = z.object({ ok: z.boolean() });
export const fn = app.defineFunction({  functionName: 'hello_get',
  eventType: 'rest',
  httpContexts: ['public'],
  method: 'get',
  basePath: 'hello',
  contentType: 'application/json',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: toPosixPath(join(APP_ROOT_ABS, 'functions', 'rest')),
});