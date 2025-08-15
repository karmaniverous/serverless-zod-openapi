import { buildPathItemObject } from '@@/src/openapi/buildPathItemObject';

import { responseSchema } from './schema';
import { securityContexts } from './securityContexts';

/**
 * The OpenAPI definition for the `GET /openapi` endpoint.
 *
 * @see https://spec.openapis.org/oas/v3.1.0#path-item-object
 */
export default buildPathItemObject(securityContexts, 'openapi', 'get', {
  summary: 'Get OpenAPI spec',
  description: 'Get OpenAPI spec.',
  responses: {
    200: {
      description: 'JGS OpenAPI specification.',
      content: {
        'application/json': {
          schema: responseSchema,
        },
      },
    },
  },
  tags: ['openapi'],
});
