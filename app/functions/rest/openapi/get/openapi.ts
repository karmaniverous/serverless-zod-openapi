import { fn, responseSchema } from './lambda';

// Register OpenAPI operation for GET /openapi
fn.openapi({
  summary: 'Get OpenAPI spec',
  description: 'Get OpenAPI spec.',
  responses: {
    200: {
      description: 'JGS OpenAPI specification.',
      content: { 'application/json': { schema: responseSchema } },
    },
  },
  tags: ['openapi'],
});

export {};