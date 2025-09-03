import { z } from 'zod';

export const stageParamsSchema = z.object({
  STAGE: z.string(),
  DOMAIN_NAME: z.string(),
  DOMAIN_CERTIFICATE_ARN: z.string(),
});

export type StageParams = z.infer<typeof stageParamsSchema>;

export const stageEnvKeys = [
  'STAGE',
] as const satisfies readonly (keyof StageParams)[];