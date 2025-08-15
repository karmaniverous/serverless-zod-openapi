import { z } from 'zod';

/**
 * Global (stage‑independent) parameter schema.  All configuration
 * keys must be defined here with their types.  Optional keys can
 * be omitted in stage files but will be validated after merging.
 */
export const globalParamsSchema = z.object({
  ESB_MINIFY: z.boolean(),
  ESB_SOURCEMAP: z.boolean(),
  PROFILE: z.string(),
  REGION: z.string(),
  SERVICE_NAME: z.string(),
});

export type GlobalParams = z.infer<typeof globalParamsSchema>;

/**
 * All globally defined parameters.  These values can be overridden
 * in stage files.
 */
export const globalParams: GlobalParams = {
  ESB_MINIFY: false,
  ESB_SOURCEMAP: true,
  PROFILE: 'JGS-SSO',
  REGION: 'ap-southeast-1',
  SERVICE_NAME: 'api-johngalt-id',
};

/**
 * Keys from GlobalParams exposed to EVERY function via provider.environment.
 * Keep these as a const tuple so we get literal types.
 */
export const globalEnvKeys = [
  'REGION',
  'SERVICE_NAME',
] as const satisfies readonly (keyof GlobalParams)[];
