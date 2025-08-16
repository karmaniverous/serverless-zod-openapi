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
      content: { 'application/json': { schema: eventSchema.shape.body } },
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
