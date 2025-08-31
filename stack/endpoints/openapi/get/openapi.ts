import { buildPathItemObject } from '@@/src';
import { serverlessConfig } from '@@/stack/config/serverlessConfig';
import { ENDPOINTS_ROOT_ABS } from '@@/stack/endpoints/_root';

import { functionConfig, responseSchema } from './config';
/** OpenAPI for `GET /openapi` */
export default buildPathItemObject(
  functionConfig,
  serverlessConfig,
  import.meta.url,
  {    summary: 'Get OpenAPI spec',
    description: 'Get OpenAPI spec.',
    responses: {
      200: {
        description: 'JGS OpenAPI specification.',
        content: { 'application/json': { schema: responseSchema } },
      },
    },
    tags: ['openapi'],
  },
  ENDPOINTS_ROOT_ABS,
);