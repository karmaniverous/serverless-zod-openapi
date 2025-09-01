/**
 * REQUIREMENTS ADDRESSED
 * - Call makeWrapHandler with only (functionConfig, businessHandler).
 * - Eliminate wrapHandler shim and stage/global injection here.
 * - Apply HTTP middleware automatically based on eventType token.
 */
import type { z } from 'zod';

import { wrapHandler } from '@/src';
import { envConfig } from '@/stack/config/app.config';
import openapi from '@/stack/openapi.json';

import { functionConfig, type responseSchema } from './config';
export const handler = wrapHandler(
  envConfig,
  functionConfig,
  async () => openapi as unknown as z.infer<typeof responseSchema>,
);