import { z } from 'zod';

import { globalParamsSchema } from './globalSchema';

/**
 * Stage‑specific parameters are defined as a partial version of the
 * global schema, with an additional required STAGE key.  Stage files
 * should only specify values they wish to override.
 */
export const stageParamsSchema = globalParamsSchema.partial().extend({
  STAGE: z.string(), // e.g. "dev", "prod",

  // test
  TEST_STAGE: z.string(), // stage-specific param not exposed as an env var.
  TEST_STAGE_ENV: z.string(), // stage-specific param exposed as an env var.
});

export type StageParams = z.infer<typeof stageParamsSchema>;
