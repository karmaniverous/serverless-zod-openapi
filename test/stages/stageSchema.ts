import { z } from 'zod';

import { globalParamsSchema } from './globalSchema';

/** Test-only stage schema: partial of global plus stage-specific keys */
export const stageParamsSchema = globalParamsSchema.partial().extend({
  STAGE: z.string(),
  DOMAIN_NAME: z.string(),
});

export type StageParams = z.infer<typeof stageParamsSchema>;
