import type { AllParams } from '@/handler/Handler';

import * as dev from './dev';
import { globalEnv, stageEnv } from './env';
import { createStagesArtifacts } from './factory';
import { globalParams } from './global';
import { globalParamsSchema } from './globalSchema';
import * as prod from './prod';
import { stageParamsSchema } from './stageSchema';

/** Build artifacts via factory (validation included) */
const {
  stages,
  environment,
  buildFunctionEnvironment: buildFnEnv,
} = createStagesArtifacts({
  globalParamsSchema,
  stageParamsSchema,
  globalParams,
  globalEnv,
  stageEnv,
  stages: {
    dev: dev.stageParams,
    prod: prod.stageParams,
  },
});

export { environment, stages };

/**
 * Production-typed wrapper that narrows the additionalKeys parameter to keys of AllParams.
 * Reuses the generic function from the factory.
 */
export const buildFunctionEnvironment = (
  additionalKeys: readonly (keyof AllParams)[] = [],
): Record<string, string> => buildFnEnv(additionalKeys);
