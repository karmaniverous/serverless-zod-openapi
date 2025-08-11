import { diff, unique } from 'radash';
import type { ZodObject, ZodRawShape } from 'zod';

type Dict<T> = Record<string, T>;

export type StagesFactoryInput<
  G extends Record<string, unknown>,
  S extends Record<string, unknown>,
> = {
  globalParamsSchema: ZodObject<ZodRawShape>;
  stageParamsSchema: ZodObject<ZodRawShape>;
  globalParams: G;
  globalEnv: readonly (keyof G)[];
  stageEnv: readonly (keyof S)[];
  stages: Dict<S>;
};

export type StagesFactoryOutput<
  G extends Record<string, unknown>,
  S extends Record<string, unknown>,
> = {
  /** Serverless 'params' object: { default: { params: G }, <stage>: { params: S } } */
  stages: { default: { params: G } } & { [K in keyof Dict<S>]: { params: S } };
  /** Provider-level environment mapping for globally exposed keys */
  environment: Record<string, string>;
  /** Helper to build per-function environment mapping for additional keys */
  buildFunctionEnvironment: (
    additionalKeys?: readonly (keyof (G & S))[],
  ) => Record<string, string>;
};

/**
 * Create all stage artifacts from provided configs.  This is generic and can
 * be used by both production and tests.
 */
export const createStagesArtifacts = <
  G extends Record<string, unknown>,
  S extends Record<string, unknown>,
>(
  input: StagesFactoryInput<G, S>,
): StagesFactoryOutput<G, S> => {
  const {
    globalParamsSchema,
    stageParamsSchema,
    globalParams,
    globalEnv,
    stageEnv,
    stages,
  } = input;

  // Validate each stage configuration:
  // 1) Stage object conforms to stage schema
  // 2) Stage merged with global satisfies required global keys
  const entries = Object.entries(stages);
  for (const [, stage] of entries) {
    stageParamsSchema.parse(stage);
    globalParamsSchema.strip().parse({ ...globalParams, ...stage });
  }

  // Build Serverless 'params' structure
  const stagesOut = entries.reduce(
    (acc, [name, params]) => {
      acc[name] = { params } as { params: S };
      return acc;
    },
    { default: { params: globalParams } } as { default: { params: G } } & {
      [K in keyof Dict<S>]: { params: S };
    },
  );

  // Build provider.environment mapping for globally exposed keys
  const globallyExposed = unique([
    ...(globalEnv as readonly string[]),
    ...(stageEnv as readonly string[]),
  ]);
  const environment = Object.fromEntries(
    globallyExposed.map((k) => [k, `\${param:${k}}`]),
  );

  // Helper for function-level environment: include only non-globally-exposed
  const buildFunctionEnvironment = (
    additionalKeys: readonly (keyof (G & S))[] = [],
  ): Record<string, string> => {
    const extras = diff(additionalKeys as readonly string[], globallyExposed);
    return Object.fromEntries(extras.map((k) => [k, `\${param:${k}}`]));
  };

  return { stages: stagesOut, environment, buildFunctionEnvironment };
};
