/**
 * Registration: POST /event/activecampaign (public)
 */

import { join } from 'node:path';

import { z } from 'zod';

import { app } from '@/app/config/app.config';
import { APP_ROOT_ABS } from '@/app/config/app.config';

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
  endpointsRootAbs: join(APP_ROOT_ABS, 'functions', 'rest').replace(/\\/g, '/'),
});
