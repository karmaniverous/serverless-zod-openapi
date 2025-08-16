import { z } from 'zod';

import type { FunctionConfig } from '@@/lib/types/FunctionConfig';
import type { HttpContext } from '@@/lib/types/HttpContext';
import type { AllParamsKeys } from '@@/src/config/stages';

export const eventSchema = z
  .object({ body: z.string() })
  .meta({ ref: 'EventActivecampaignGetEvent' });
export const responseSchema = z
  .string()
  .meta({ ref: 'EventActivecampaignGetResponse' });

const fnEnvKeys = [] as const satisfies readonly AllParamsKeys[];
const httpContexts = ['public'] as const satisfies readonly HttpContext[];

export const functionConfig: FunctionConfig<
  typeof eventSchema,
  typeof responseSchema
> = {
  functionName: 'eventActivecampaignPost',
  fnEnvKeys,
  contentType: 'application/json',
  eventSchema,
  responseSchema,
  events: [{ http: { method: 'post', path: 'event/activecampaign' } }],
  httpContexts,
};
