import { z } from 'zod';

/**
 * Global (stage‑independent) parameter schema.  All configuration
 * keys must be defined here with their types.  Optional keys can
 * be omitted in stage files but will be validated after merging.
 */
export const globalParamsSchema = z.object({
  SERVICE_NAME: z.string(),
  REGION: z.string(),
  PROFILE: z.string(),
  ESB_MINIFY: z.boolean().default(false),
  ESB_SOURCEMAP: z.boolean().default(true),
  TEST_GLOBAL: z.string(), // stage-specific param not exposed as an env var.
  TEST_GLOBAL_ENV: z.string(), // stage-specific param exposed as an env var.
});

export type GlobalParams = z.infer<typeof globalParamsSchema>;
