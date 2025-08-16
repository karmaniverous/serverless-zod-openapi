import { z } from 'zod';

import { globalParamsSchema } from './global';

export const stageParamsSchema = globalParamsSchema.partial().extend({
  STAGE: z.string(),
  DOMAIN_NAME: z.string(),
});

export type StageParams = z.infer<typeof stageParamsSchema>;

export const stageEnvKeys = [
  'STAGE',
] as const satisfies readonly (keyof StageParams)[];
