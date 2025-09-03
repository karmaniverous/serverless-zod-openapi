import { describe, expect, it } from 'vitest';

import { defineAppConfig } from '@/src';
import {
  globalEnvKeys,
  globalParams,
  globalParamsSchema,
} from '@/src/test/serverless/config/global';
import { serverlessConfig } from '@/src/test/serverless/config/serverlessConfig';
import {
  stageEnvKeys,
  stageParamsSchema,
} from '@/src/test/serverless/config/stage';
import { devStageParams } from '@/src/test/serverless/config/stages/dev';
import { prodStageParams } from '@/src/test/serverless/config/stages/prod';

describe('defineAppConfig (runtime)', () => {
  const cfg = defineAppConfig(globalParamsSchema, stageParamsSchema, {
    serverless: serverlessConfig,
    global: { params: globalParams, envKeys: globalEnvKeys },
    stage: {
      params: { dev: devStageParams, prod: prodStageParams },
      envKeys: stageEnvKeys,
    },
  });

  it('produces stages with default + named stages', () => {
    const keys = Object.keys(cfg.stages);
    expect(keys).toEqual(expect.arrayContaining(['default', 'dev', 'prod']));
  });

  it('builds provider-level environment from exposed keys', () => {
    expect(cfg.environment).toEqual(
      expect.objectContaining({
        REGION: '${param:REGION}',
        SERVICE_NAME: '${param:SERVICE_NAME}',
        STAGE: '${param:STAGE}',
      }),
    );
  });

  it('buildFnEnv maps only non-globally-exposed keys', () => {
    // PROFILE (global but not globally exposed) + DOMAIN_NAME (stage)
    const env = cfg.buildFnEnv(['PROFILE', 'DOMAIN_NAME']);
    expect(env).toEqual({
      PROFILE: '${param:PROFILE}',
      DOMAIN_NAME: '${param:DOMAIN_NAME}',
    });
  });

  it('buildFnEnv returns empty object when no extras are requested', () => {
    const env = cfg.buildFnEnv();
    expect(env).toEqual({});
  });
});
