import { z } from 'zod';

/**
 * Global (stage‑independent) parameter schema.  All configuration
 * keys must be defined here with their types.  Optional keys can
 * be omitted in stage files but will be validated after merging.
 */
export const globalParamsSchema = z.object({
  ESB_MINIFY: z.boolean(),
  ESB_SOURCEMAP: z.boolean(),
  PROFILE: z.string(),
  REGION: z.string(),
  SERVICE_NAME: z.string(),
});

export type GlobalParams = z.infer<typeof globalParamsSchema>;
