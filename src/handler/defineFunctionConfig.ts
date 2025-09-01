import type { z, ZodObject, ZodRawShape } from 'zod';

import type { EnvSchemaNode } from '@/src/config/defineAppConfig';
import type { FunctionConfig } from '@/src/types/FunctionConfig';
import type { EventTypeMap as LocalEventTypeMap } from '@/stack/config/EventTypeMap';

/**
 * Private symbol used to attach env (schemas + envKeys) to FunctionConfig instances.
 */
export const ENV_CONFIG = Symbol.for('szo.envConfig');

export interface EnvAttached<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
  StageParamsSchema extends ZodObject<ZodRawShape>,
> {
  [ENV_CONFIG]: {
    global: EnvSchemaNode<GlobalParamsSchema>;
    stage: EnvSchemaNode<StageParamsSchema>;
  };
}

export function getEnvFromFunctionConfig<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
  StageParamsSchema extends ZodObject<ZodRawShape>,
>(
  fc: unknown,
): {
  global: EnvSchemaNode<GlobalParamsSchema>;
  stage: EnvSchemaNode<StageParamsSchema>;
} {
  const env = (fc as { [ENV_CONFIG]?: unknown })[ENV_CONFIG];
  if (!env) {
    throw new Error(
      'FunctionConfig is missing env attachment. Use defineFunctionConfig(env)(...) when authoring.',
    );
  }
  return env as {
    global: EnvSchemaNode<GlobalParamsSchema>;
    stage: EnvSchemaNode<StageParamsSchema>;
  };
}

/**
 * Curried builder that binds application env schemas and keys to a function config.
 * - First call with env { global: { paramsSchema, envKeys }, stage: { paramsSchema, envKeys } }.
 * - Then provide the per-function config object; returns a branded FunctionConfig.
 *
 * EventSchema/ResponseSchema are inferred from the functionConfig argument.
 * EventType is explicit (binds to the project-local EventTypeMap).
 * Global/Stage params types are derived from the provided schemas.
 */
export function defineFunctionConfig<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
  StageParamsSchema extends ZodObject<ZodRawShape>,
>(env: {
  global: EnvSchemaNode<GlobalParamsSchema>;
  stage: EnvSchemaNode<StageParamsSchema>;
}) {
  return function define<
    EventType extends keyof LocalEventTypeMap,
    EventSchema extends z.ZodType | undefined,
    ResponseSchema extends z.ZodType | undefined,
  >(
    functionConfig: FunctionConfig<
      EventSchema,
      ResponseSchema,
      z.infer<GlobalParamsSchema>,
      z.infer<StageParamsSchema>,
      LocalEventTypeMap,
      EventType
    >,
  ): FunctionConfig<
    EventSchema,
    ResponseSchema,
    z.infer<GlobalParamsSchema>,
    z.infer<StageParamsSchema>,
    LocalEventTypeMap,
    EventType
  > &
    EnvAttached<GlobalParamsSchema, StageParamsSchema> {
    return Object.assign({}, functionConfig, {
      [ENV_CONFIG]: env,
    });
  };
}
