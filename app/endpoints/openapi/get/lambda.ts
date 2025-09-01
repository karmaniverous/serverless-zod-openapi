/**
 * Registration: GET /openapi (public)
 */
import { z } from 'zod';

import { app } from '@/app/config/app.config';
import { ENDPOINTS_ROOT_ABS } from '@/app/endpoints/_root';

export const responseSchema = z.object({});

export const fn = app.defineFunction({
  functionName: 'openapi_get',
  eventType: 'rest',
  httpContexts: ['public'],
  method: 'get',
  basePath: 'openapi',
  contentType: 'application/json',
  eventSchema: undefined,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: ENDPOINTS_ROOT_ABS,
});

export type Response = z.infer<typeof responseSchema>;
