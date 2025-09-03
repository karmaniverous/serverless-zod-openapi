import type { z} from 'zod';
import { type ZodObject, type ZodRawShape } from 'zod';

import { stagesFactory } from '@/src/serverless/stagesFactory';

/**
 * Compose stage artifacts (effective schema + parsed stages + env helpers).
 *
 * Extracted from App.ts to keep the class focused on orchestration.
 */
export function buildStageArtifacts<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
  StageParamsSchema extends ZodObject<ZodRawShape>,
>(
  globalParamsSchema: GlobalParamsSchema,
  stageParamsSchema: StageParamsSchema,
  global: {
    params: z.infer<GlobalParamsSchema>;
    envKeys: readonly (keyof z.infer<GlobalParamsSchema>)[];
  },
  stage: {
    params: Record<string, Record<string, unknown>>;
    envKeys: readonly (keyof z.infer<StageParamsSchema>)[];
  },
) {
  const effectiveStageParamsSchema = globalParamsSchema
    .partial()
    .extend(
      (stageParamsSchema as unknown as ZodObject<ZodRawShape>)
        .shape as Record<string, z.ZodType>,
    );

  const typedStages = Object.fromEntries(
    Object.entries(stage.params).map(([name, params]) => {
      const parsed = (
        effectiveStageParamsSchema as unknown as z.ZodType
      ).parse(params) as z.infer<typeof effectiveStageParamsSchema>;
      return [name, parsed];
    }),
  ) as Record<string, z.infer<StageParamsSchema>>;

  return stagesFactory({
    globalParamsSchema,
    stageParamsSchema: effectiveStageParamsSchema,
    globalParams: global.params,
    globalEnvKeys: global.envKeys,
    stageEnvKeys: stage.envKeys,
    stages: typedStages,
  });
}
