import * as dev from './dev';
import { globalEnv, stageEnv } from './env';
import { createStagesArtifacts } from './factory';
import { globalParams } from './global';
import { type GlobalParams, globalParamsSchema } from './globalSchema';
import * as prod from './prod';
import { type StageParams, stageParamsSchema } from './stageSchema';

// ✅ export the canonical param union type from the stages path
export type AllParams = GlobalParams & StageParams;

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

/** Narrow additionalKeys to keys of AllParams */
export const buildFunctionEnvironment = (
  additionalKeys: readonly (keyof AllParams)[] = [],
): Record<string, string> => buildFnEnv(additionalKeys);
