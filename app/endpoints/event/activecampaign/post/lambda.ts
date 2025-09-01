/**
 * Registration: POST /event/activecampaign (public)
 */
import { z } from 'zod';

import { app } from '@/app/config/app.config';
import { ENDPOINTS_ROOT } from '@/app/endpoints/_root';

export const eventSchema = z.any();
export const responseSchema = z.string();

export const fn = app.defineFunction({
  functionName: 'activecampaign_post',
  eventType: 'rest',
  httpContexts: ['public'],
  method: 'post',
  basePath: 'event/activecampaign',
  contentType: 'application/json',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: ENDPOINTS_ROOT,
});
