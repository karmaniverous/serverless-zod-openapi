import type { z} from 'zod';
import { type ZodObject, type ZodRawShape } from 'zod';

import { stagesFactory } from '@/src/serverless/stagesFactory';
import type { SecurityContextHttpEventMap } from '@/src/types/SecurityContextHttpEventMap';

/** Base: envKeys tied to a Zod schema’s inferred keys. */
export interface EnvKeysNode<Schema extends ZodObject<ZodRawShape>> {
  envKeys: readonly (keyof z.infer<Schema>)[];
}

/** For wrapper input: schema + envKeys. */
export interface EnvSchemaNode<Schema extends ZodObject<ZodRawShape>>
  extends EnvKeysNode<Schema> {
  paramsSchema: Schema;
}

/** Wrapper input: no glue; both global and stage sides. */
export interface GlobalEnvConfig<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
  StageParamsSchema extends ZodObject<ZodRawShape>,
> {
  global: EnvSchemaNode<GlobalParamsSchema>;
  stage: EnvSchemaNode<StageParamsSchema>;
}

/** Authoring input — global: concrete params + envKeys. */
export interface GlobalParamsNode<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
> extends EnvKeysNode<GlobalParamsSchema> {
  params: z.infer<GlobalParamsSchema>;
}

/** Authoring input — stage: per-stage params + envKeys. */
export interface StageParamsNode<
  StageParamsSchema extends ZodObject<ZodRawShape>,
> extends EnvKeysNode<StageParamsSchema> {
  params: Record<string, z.infer<StageParamsSchema>>;
}

/** Authoring input for unified app config (serverless + env). */
export interface DefineAppConfigInput<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
  StageParamsSchema extends ZodObject<ZodRawShape>,
> {
  serverless: {
    defaultHandlerFileName: string;
    defaultHandlerFileExport: string;
    httpContextEventMap: SecurityContextHttpEventMap;
  };
  global: GlobalParamsNode<GlobalParamsSchema>;
  stage: StageParamsNode<StageParamsSchema>;
}

export interface DefineAppConfigOutput<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
  StageParamsSchema extends ZodObject<ZodRawShape>,
> extends GlobalEnvConfig<GlobalParamsSchema, StageParamsSchema> {
  serverless: DefineAppConfigInput<GlobalParamsSchema, StageParamsSchema>['serverless'];
  stages: ReturnType<typeof stagesFactory>['stages'];
  environment: ReturnType<typeof stagesFactory>['environment'];
  buildFnEnv: ReturnType<typeof stagesFactory>['buildFnEnv'];
}

export function defineAppConfig<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
  StageParamsSchema extends ZodObject<ZodRawShape>,
>(
  globalParamsSchema: GlobalParamsSchema,
  stageParamsSchema: StageParamsSchema,
  input: DefineAppConfigInput<GlobalParamsSchema, StageParamsSchema>,
): DefineAppConfigOutput<GlobalParamsSchema, StageParamsSchema> {
  const assertKeysSubset = (
    schema: ZodObject<ZodRawShape>,
    keys: readonly string[],
    label: string,
  ): void => {
    const allowed = new Set(Object.keys(schema.shape));
    const bad = keys.filter((k) => !allowed.has(k));
    if (bad.length) throw new Error(`${label} contains unknown keys: ${bad.join(', ')}`);
  };
  assertKeysSubset(globalParamsSchema, input.global.envKeys as readonly string[], 'global.envKeys');
  assertKeysSubset(stageParamsSchema, input.stage.envKeys as readonly string[], 'stage.envKeys');

  const sf = stagesFactory({
    globalParamsSchema,
    stageParamsSchema,
    globalParams: input.global.params,
    globalEnvKeys: input.global.envKeys,
    stageEnvKeys: input.stage.envKeys,
    stages: input.stage.params,
  });

  return {
    serverless: input.serverless,
    global: { paramsSchema: globalParamsSchema, envKeys: input.global.envKeys },
    stage: { paramsSchema: stageParamsSchema, envKeys: input.stage.envKeys },
    stages: sf.stages,
    environment: sf.environment,
    buildFnEnv: sf.buildFnEnv,
  };
}
