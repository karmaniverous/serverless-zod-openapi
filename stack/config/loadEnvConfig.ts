import type { ZodObject, ZodRawShape } from 'zod';

import { globalEnvKeys, globalParamsSchema } from './global';
import { stageEnvKeys, stageParamsSchema } from './stage';

export const loadEnvConfig = async (): Promise<{
  globalEnvKeys: readonly PropertyKey[];
  globalParamsSchema: ZodObject<ZodRawShape>;
  stageEnvKeys: readonly PropertyKey[];
  stageParamsSchema: ZodObject<ZodRawShape>;
}> => ({
  globalEnvKeys,
  // cast to generic ZodObject for the wrapper’s type
  globalParamsSchema: globalParamsSchema as unknown as ZodObject<ZodRawShape>,
  stageEnvKeys,
  stageParamsSchema: stageParamsSchema as unknown as ZodObject<ZodRawShape>,
});
