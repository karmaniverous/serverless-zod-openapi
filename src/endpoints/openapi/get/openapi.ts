import { buildPathItemObject } from '@@/lib/openapi/buildPathItemObject';
import { serverlessConfig } from '@@/src/config/serverlessConfig';

import { functionConfig, responseSchema } from './config';

/** OpenAPI for `GET /openapi` */
export default buildPathItemObject(
  functionConfig,
  serverlessConfig,
  import.meta.url,
  {
    summary: 'Get OpenAPI spec',
    description: 'Get OpenAPI spec.',
    responses: {
      200: {
        description: 'JGS OpenAPI specification.',
        content: { 'application/json': { schema: responseSchema } },
      },
    },
    tags: ['openapi'],
  },
);
