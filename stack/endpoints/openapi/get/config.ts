/**
 * REQUIREMENTS ADDRESSED
 * - HTTP config: eventType='rest' with response schema.
 * - No generics; rely on local EventTypeMap inference.
 */
import { z } from 'zod';

import { defineFunctionConfig } from '@/src';
import { envConfig } from '@/stack/config/app.config';

export const eventSchema = undefined;
export const responseSchema = z.object({});
const defineFn = defineFunctionConfig(envConfig);
export const functionConfig = defineFn({
  eventType: 'rest',
  functionName: 'openapi_get',
  contentType: 'application/json',
  httpContexts: ['public'],
  method: 'get',
  basePath: 'openapi',
  eventSchema,
  responseSchema,
});