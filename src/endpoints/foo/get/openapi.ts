import { buildPathItemObject } from '@/src/openapi/buildPathItemObject';

import { eventSchema, responseSchema } from './schema';

/**
 * The OpenAPI definition for the `GET /foo` endpoint.
 *
 * @see https://spec.openapis.org/oas/v3.1.0#path-item-object
 */
const openapi = buildPathItemObject(['private', 'public'], 'foo', 'get', {
  summary: 'Get foo',
  description: 'Get some what from foo.',
  requestParams: { query: eventSchema.shape.queryStringParameters },
  responses: {
    200: {
      description: 'Got some foo!',
      content: {
        'application/json': {
          schema: responseSchema,
        },
      },
    },
  },
  tags: ['foo'],
});

export default openapi;
