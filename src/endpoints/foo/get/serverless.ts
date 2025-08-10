import type { AWS } from '@serverless/typescript';

/**
 * The serverless function definition for the `GET /foo` endpoint.
 *
 * @see https://www.serverless.com/framework/docs/providers/aws/guide/functions
 */
const functions: AWS['functions'] = {
  fooGet: {
    handler: 'src/endpoints/foo/get/index.handler',
    events: [
      {
        http: {
          method: 'get',
          path: 'foo',
        },
      },
    ],
  },
};

export default functions;
