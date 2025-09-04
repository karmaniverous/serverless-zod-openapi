/**
 * Registration: GET /openapi (public)
 */
import { z } from 'zod';

import { app } from '@/app/config/app.config';
import { ENDPOINTS_ROOT } from '@/app/endpoints/_root';

export const responseSchema = z.any();

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
  endpointsRootAbs: ENDPOINTS_ROOT,
});

export type Response = z.infer<typeof responseSchema>;
