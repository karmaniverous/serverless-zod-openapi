import { z } from 'zod';

/**
 * Global (stage‑independent) parameter schema.  All configuration
 * keys must be defined here with their types.  Optional keys can
 * be omitted in stage files but will be validated after merging.
 */
export const globalParamSchema = z.object({
  SERVICE_NAME: z.string(),
  REGION: z.string(),
  PROFILE: z.string(),

  /** esbuild settings */
  ESB_MINIFY: z.boolean().default(false),
  ESB_SOURCEMAP: z.boolean().default(true),
});

export type GlobalParams = z.infer<typeof globalParamSchema>;
