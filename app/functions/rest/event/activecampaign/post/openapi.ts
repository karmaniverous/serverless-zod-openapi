/* REQUIREMENTS ADDRESSED
- Define OpenAPI Path Item for ActiveCampaign event webhook.
- The request body schema is the provided `eventSchema` (omit if undefined).
- The 200 response schema is the provided `responseSchema`.
*/
import { eventSchema, fn, responseSchema } from './lambda';

fn.openapi({
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
});

export {};