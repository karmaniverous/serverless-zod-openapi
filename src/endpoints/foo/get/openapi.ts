import { buildPathItemObject } from '@/openapi/buildPathItemObject';

import { eventSchema, responseSchema } from './schema';

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
