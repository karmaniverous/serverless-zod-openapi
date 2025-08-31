import { z } from 'zod';

import { globalParamsSchema } from './global';

/**
 * Stage‑specific parameters are defined as a partial version of the
 * global schema, with an additional required STAGE key.  Stage files
 * should only specify values they wish to override.
 */
export const stageParamsSchema = globalParamsSchema.partial().extend({
  DOMAIN_CERTIFICATE_ARN: z.string(),
  DOMAIN_NAME: z.string(),
  STAGE: z.string(), // e.g. "dev", "prod",
});

export type StageParams = z.infer<typeof stageParamsSchema>;

/**
 * Keys from StageParams exposed to EVERY function via provider.environment.
 * Example includes STAGE and any stage-scoped vars you want globally.
 */
export const stageEnvKeys = [
  'STAGE',
] as const satisfies readonly (keyof StageParams)[];
