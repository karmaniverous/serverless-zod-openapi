import { buildPathItemObject } from '@@/src/openapi/buildPathItemObject';

import { eventSchema, responseSchema } from './schema';
import { securityContexts } from './securityContexts';

export default buildPathItemObject(
  securityContexts,
  'event/activecampaign',
  'post',
  {
    summary: 'ActiveCampaign events',
    description: 'Receive ActiveCampaign event webhooks.',
    requestBody: {
      description: 'Webhook payload.',
      content: {
        'application/json': {
          schema: eventSchema.shape.body,
        },
      },
    },
    responses: {
      200: {
        description: 'Ok',
        content: {
          'application/json': {
            schema: responseSchema,
          },
        },
      },
    },
    tags: [],
  },
);
