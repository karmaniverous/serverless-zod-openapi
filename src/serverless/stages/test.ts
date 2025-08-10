import type { StageParams } from './stageSchema';

export const stageParams: StageParams = {
  STAGE: 'test',
};

export const stageExposedEnvKeys: (keyof StageParams)[] = [];
