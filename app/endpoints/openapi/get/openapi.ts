import { serverlessConfig } from '@/app/config/serverlessConfig';
import { ENDPOINTS_ROOT_ABS } from '@/app/endpoints/_root';
import { buildOpenApiPath } from '@/src';

import { functionConfig, responseSchema } from './config';
/** OpenAPI for `GET /openapi` */
export default buildOpenApiPath(
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
  ENDPOINTS_ROOT_ABS,
);
