import type { z } from 'zod';

import { wrapHandler } from '@@/lib/handler/wrapHandler';
import openapi from '@@/src/openapi.json';

import { functionConfig, type responseSchema } from './config';

export const handler = wrapHandler(
  async () => openapi as unknown as z.infer<typeof responseSchema>,
  functionConfig,
);
