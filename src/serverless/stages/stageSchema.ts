import { z } from 'zod';

import { globalParamSchema } from './globalSchema';

/**
 * Stage‑specific parameters are defined as a partial version of the
 * global schema, with an additional required STAGE key.  Stage files
 * should only specify values they wish to override.
 */
export const stageParamSchema = globalParamSchema.partial().extend({
  STAGE: z.string(), // e.g. "dev", "prod"
});

export type StageParams = z.infer<typeof stageParamSchema>;
