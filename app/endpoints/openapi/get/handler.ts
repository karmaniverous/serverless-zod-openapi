/**
 * REQUIREMENTS ADDRESSED
 * - Call makeWrapHandler with only (functionConfig, businessHandler).
 * - Eliminate wrapHandler shim and stage/global injection here.
 * - Apply HTTP middleware automatically based on eventType token.
 */
import type { z } from 'zod';

import openapi from '@/app/openapi.json';
import { wrapHandler } from '@/src';

import { functionConfig, type responseSchema } from './config';
export const handler = wrapHandler(
  functionConfig,
  async () => openapi as unknown as z.infer<typeof responseSchema>,
);
