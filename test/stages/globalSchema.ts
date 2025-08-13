import { z } from 'zod';

/** Test-only global schema */
export const globalParamsSchema = z.object({
  ESB_MINIFY: z.boolean(),
  ESB_SOURCEMAP: z.boolean(),
  FN_ENV: z.string(),
  PROFILE: z.string(),
  REGION: z.string(),
  SERVICE_NAME: z.string(),
});

export type GlobalParams = z.infer<typeof globalParamsSchema>;
