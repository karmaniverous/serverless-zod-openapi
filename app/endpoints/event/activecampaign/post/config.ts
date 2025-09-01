/**
 * REQUIREMENTS ADDRESSED
 * - HTTP config: eventType='rest'; HTTP keys allowed.
 * - Include eventSchema & responseSchema; rely on inference (no generics or dynamic type imports).
 * - Keep BaseEventTypeMap/EventTypeMap keys as-is; no shims.
 */
import { z } from 'zod';

import { envConfig } from '@/app/config/app.config';
import { defineFunctionConfig } from '@/src';

export const eventSchema = z.any();
export const responseSchema = z.string();
const defineFn = defineFunctionConfig(envConfig);
export const functionConfig = defineFn({
  eventType: 'rest',
  functionName: 'activecampaign_post',
  contentType: 'application/json',
  httpContexts: ['public'],
  method: 'post',
  basePath: 'event/activecampaign',
  eventSchema,
  responseSchema,
});
