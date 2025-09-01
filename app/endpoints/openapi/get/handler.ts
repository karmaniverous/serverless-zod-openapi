/**
 * REQUIREMENTS ADDRESSED
 * - Call makeWrapHandler with only (functionConfig, businessHandler).
 * - Eliminate wrapHandler shim and stage/global injection here.
 * - Apply HTTP middleware automatically based on eventType token.
 */
import openapi from '@/app/openapi.json';

import type { responseSchema } from './lambda';
import { fn } from './lambda';
export const handler = fn.handler(async () => openapi as import('zod').infer<typeof responseSchema>);