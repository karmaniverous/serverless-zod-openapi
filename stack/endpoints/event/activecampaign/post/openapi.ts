/* REQUIREMENTS ADDRESSED
- Define OpenAPI Path Item for ActiveCampaign event webhook.
- The request body schema is the provided `eventSchema` (omit if undefined).
- The 200 response schema is the provided `responseSchema`.
*/
import { buildPathItemObject } from '@/src';
import { serverlessConfig } from '@/stack/config/serverlessConfig';
import { ENDPOINTS_ROOT_ABS } from '@/stack/endpoints/_root';

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
  ENDPOINTS_ROOT_ABS,
);
