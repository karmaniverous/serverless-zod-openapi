import { diff, unique } from 'radash';
import type { ZodObject, ZodRawShape } from 'zod';

type Dict<T> = Record<string, T>;

export type StagesFactoryInput<
  GlobalParams extends Record<string, unknown>,
  StagePrams extends Record<string, unknown>,
> = {
  globalParamsSchema: ZodObject<ZodRawShape>;
  stageParamsSchema: ZodObject<ZodRawShape>;
  globalParams: GlobalParams;
  globalEnvKeys: readonly (keyof GlobalParams)[];
  stageEnvKeys: readonly (keyof StagePrams)[];
  stages: Dict<StagePrams>;
};

export type StagesFactoryOutput<
  GlobalParams extends Record<string, unknown>,
  StagePrams extends Record<string, unknown>,
> = {
  /** Serverless 'params' object: { default: { params: GlobalParams }, <stage>: { params: StagePrams } } */
  stages: { default: { params: GlobalParams } } & {
    [K in keyof Dict<StagePrams>]: { params: StagePrams };
  };
  /** Provider-level environment mapping for globally exposed keys */
  environment: Record<string, string>;
  /** Helper to build per-function environment mapping for additional keys */
  buildFnEnv: (
    fnEnvKeys?: readonly (keyof (GlobalParams & StagePrams))[],
  ) => Record<string, string>;
};

/**
 * Create all stage artifacts from provided configs.  This is generic and can
 * be used by both production and tests.
 */
export const stagesFactory = <
  GlobalParams extends Record<string, unknown>,
  StagePrams extends Record<string, unknown>,
>(
  input: StagesFactoryInput<GlobalParams, StagePrams>,
): StagesFactoryOutput<GlobalParams, StagePrams> => {
  const {
    globalParamsSchema,
    stageParamsSchema,
    globalParams,
    globalEnvKeys,
    stageEnvKeys,
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
      acc[name] = { params } as { params: StagePrams };
      return acc;
    },
    { default: { params: globalParams } } as {
      default: { params: GlobalParams };
    } & {
      [K in keyof Dict<StagePrams>]: { params: StagePrams };
    },
  );

  // Build provider.environment mapping for globally exposed keys
  const globallyExposed = unique([
    ...(globalEnvKeys as readonly string[]),
    ...(stageEnvKeys as readonly string[]),
  ]);
  const environment = Object.fromEntries(
    globallyExposed.map((k) => [k, `\${param:${k}}`]),
  );

  // Helper for function-level environment: include only non-globally-exposed
  const buildFnEnv = (
    fnEnvKeys: readonly (keyof (GlobalParams & StagePrams))[] = [],
  ): Record<string, string> => {
    const extras = diff(fnEnvKeys as readonly string[], globallyExposed);
    return Object.fromEntries(extras.map((k) => [k, `\${param:${k}}`]));
  };

  return { stages: stagesOut, environment, buildFnEnv };
};
