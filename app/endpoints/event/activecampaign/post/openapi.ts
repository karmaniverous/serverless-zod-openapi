/* REQUIREMENTS ADDRESSED
- Define OpenAPI Path Item for ActiveCampaign event webhook.
- The request body schema is the provided `eventSchema` (omit if undefined).
- The 200 response schema is the provided `responseSchema`.
*/
import { serverlessConfig } from '@/app/config/serverlessConfig';
import { ENDPOINTS_ROOT_ABS } from '@/app/endpoints/_root';
import { buildOpenApiPath } from '@/src';

import { eventSchema, functionConfig, responseSchema } from './config';
export default buildOpenApiPath(
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
  ENDPOINTS_ROOT_ABS,
);
