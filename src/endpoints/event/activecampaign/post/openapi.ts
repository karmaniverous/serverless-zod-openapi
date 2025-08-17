/* REQUIREMENTS ADDRESSED
- Define OpenAPI Path Item for ActiveCampaign event webhook.
- The request body schema is the provided `eventSchema`.
- The 200 response schema is the provided `responseSchema`.
*/
import { buildPathItemObject } from '@@/lib/openapi/buildPathItemObject';
import { serverlessConfig } from '@@/src/config/serverlessConfig';

import { eventSchema, functionConfig, responseSchema } from './config';

export default buildPathItemObject(
  functionConfig,
  serverlessConfig,
  import.meta.url,
  {
    summary: 'ActiveCampaign events',
    description: 'Receive ActiveCampaign event webhooks.',
    requestBody: {
      description: 'Webhook payload.',
      content: { 'application/json': { schema: eventSchema } },
    },
    responses: {
      200: {
        description: 'Ok',
        content: { 'application/json': { schema: responseSchema } },
      },
    },
    tags: [],
  },
);
