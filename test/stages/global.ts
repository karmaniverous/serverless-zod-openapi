import { z } from 'zod';

export const globalParamsSchema = z.object({
  ESB_MINIFY: z.boolean(),
  ESB_SOURCEMAP: z.boolean(),
  FN_ENV: z.string(),
  PROFILE: z.string(),
  REGION: z.string(),
  SERVICE_NAME: z.string(),
});

export type GlobalParams = z.infer<typeof globalParamsSchema>;

export const globalParams: GlobalParams = {
  ESB_MINIFY: false,
  ESB_SOURCEMAP: true,
  FN_ENV: 'test',
  PROFILE: 'dev',
  REGION: 'us-east-1',
  SERVICE_NAME: 'svc-test',
};

export const globalEnvKeys = [
  'SERVICE_NAME',
  'PROFILE',
] as const satisfies readonly (keyof GlobalParams)[];
