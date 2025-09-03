import { z } from 'zod';

import type { SecurityContextHttpEventMap } from '@/src/types/SecurityContextHttpEventMap';

/**
 * Zod schema for implementation-wide Serverless config.
 *
 * Extracted to keep App.ts slim and focused on orchestration.
 */
export const serverlessConfigSchema = z.object({
  /** Context -> event fragment to merge into generated http events */
  httpContextEventMap: z.custom<SecurityContextHttpEventMap>(),
  /** Used to construct default handler string if missing on a function */
  defaultHandlerFileName: z.string().min(1),
  defaultHandlerFileExport: z.string().min(1),
});

export type AppServerlessConfig = z.infer<typeof serverlessConfigSchema>;
