/* src/endpoints/openapi/get/config.ts */
import { z } from 'zod';

import type { FunctionConfig } from '@@/lib/types/FunctionConfig';
import type { HttpContext } from '@@/lib/types/HttpContext';
import type { AllParamsKeys } from '@@/src/config/stages';

export const responseSchema = z.object({}); // static JSON shape; widen as needed

export const functionConfig: FunctionConfig<undefined, typeof responseSchema> =
  {
    functionName: 'openapi_get',
    fnEnvKeys: [] as readonly AllParamsKeys[],
    contentType: 'application/json',
    httpContexts: ['public' as HttpContext],
    method: 'get',
    basePath: 'openapi',
  };
