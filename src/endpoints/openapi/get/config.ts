import { z } from 'zod';

import type { FunctionConfig } from '@@/lib/types/FunctionConfig';
import type { HttpContext } from '@@/lib/types/HttpContext';
import type { AllParamsKeys } from '@@/src/config/stages';

export const responseSchema = z
  .object({})
  .loose()
  .meta({ ref: 'OpenapiGetResponse' });

const fnEnvKeys = [] as const satisfies readonly AllParamsKeys[];
const httpContexts = ['public'] as const satisfies readonly HttpContext[];

export const functionConfig: FunctionConfig<undefined, typeof responseSchema> =
  {
    functionName: 'openapiGet',
    fnEnvKeys,
    contentType: 'application/json',
    responseSchema,
    events: [{ http: { method: 'get', path: 'openapi' } }],
    httpContexts,
  };
