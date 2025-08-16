import { z } from 'zod';

import type { FunctionConfig } from '@@/lib/types/FunctionConfig';
import { contactSchema } from '@@/services/activecampaign/src';
import type { AllParamsKeys } from '@@/src/config/stages';

export const eventSchema = z.object({
  body: z.object({ contactId: z.string() }),
});

export const responseSchema = contactSchema.optional();

const fnEnvKeys = [] as const satisfies readonly AllParamsKeys[];

export const functionConfig: FunctionConfig<
  typeof eventSchema,
  typeof responseSchema
> = {
  functionName: 'getContact',
  fnEnvKeys,
  contentType: 'application/json',
  eventSchema,
  responseSchema,
  // Non-HTTP; no httpContexts, basePath, or method required.
};
