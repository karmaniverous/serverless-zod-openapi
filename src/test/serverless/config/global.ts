import { z } from 'zod';

export const globalParamsSchema = z.object({
  ESB_MINIFY: z.boolean(),
  ESB_SOURCEMAP: z.boolean(),
  PROFILE: z.string(),
  REGION: z.string(),
  SERVICE_NAME: z.string(),
});

export type GlobalParams = z.infer<typeof globalParamsSchema>;

export const globalParams: GlobalParams = {
  ESB_MINIFY: false,
  ESB_SOURCEMAP: true,
  PROFILE: 'dev',
  REGION: 'us-east-1',
  SERVICE_NAME: 'svc-test',
};

export const globalEnvKeys = [
  'REGION',
  'SERVICE_NAME',
] as const satisfies readonly (keyof GlobalParams)[];