import { z } from 'zod';

import type { SecurityContextHttpEventMap } from '@/src/types/SecurityContextHttpEventMap';

/**
 * Zod schema for implementation-wide Serverless config.
 * - This schema lives in src so the App can parse inputs internally.
 */
export const serverlessConfigSchema = z.object({
  /**
   * Context -> event fragment to merge into generated HTTP events
   * (shape is platform-specific; keep it opaque via SecurityContextHttpEventMap).
   */
  httpContextEventMap: z.custom<SecurityContextHttpEventMap>(),
  /** Used to construct default handler string if missing on a function */
  defaultHandlerFileName: z.string().min(1),
  defaultHandlerFileExport: z.string().min(1),
});

export type ServerlessConfigInput = z.input<typeof serverlessConfigSchema>;
export type ServerlessConfig = z.infer<typeof serverlessConfigSchema>;
