/**
 * REQUIREMENTS ADDRESSED
 * - Call makeWrapHandler with only (functionConfig, businessHandler).
 * - Eliminate wrapHandler shim and stage/global injection here.
 * - Apply HTTP middleware automatically based on eventType token.
 */
import type { z } from 'zod';

import openapi from '@/app/openapi.json';

import type { responseSchema } from './lambda';
import { fn, type Response } from './lambda';

export const handler = fn.handler(async () => {
  return openapi as unknown as z.infer<typeof responseSchema & z.ZodType<Response>>;
});