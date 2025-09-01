/**
 * REQUIREMENTS ADDRESSED
 * - HTTP config: eventType='rest' with response schema.
 * - No generics; rely on local EventTypeMap inference.
 */
import { z } from 'zod';

import { defineFunctionConfig } from '@/src';

export const eventSchema = undefined;
export const responseSchema = z.object({});
export const functionConfig = defineFunctionConfig({
  eventType: 'rest',
  functionName: 'openapi_get',
  contentType: 'application/json',
  httpContexts: ['public'],
  method: 'get',  basePath: 'openapi',
  eventSchema,
  responseSchema,
});
