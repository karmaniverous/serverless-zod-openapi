import { z } from 'zod';

import type { FunctionConfig } from '@@/lib/types/FunctionConfig';
import type { HttpContext } from '@@/lib/types/HttpContext';
import type { AllParamsKeys } from '@@/src/config/stages';

export const eventSchema = z.object({}); // if you want to skip, set this to undefined
export const responseSchema = z.object({ ok: z.boolean() });

export const functionConfig: FunctionConfig<
  typeof eventSchema,
  typeof responseSchema
> = {
  functionName: 'activecampaign_post',
  fnEnvKeys: [] as readonly AllParamsKeys[],
  contentType: 'application/json',
  httpContexts: ['public' as HttpContext],
  method: 'post',
  basePath: 'event/activecampaign',
};
