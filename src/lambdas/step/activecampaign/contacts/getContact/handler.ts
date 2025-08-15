import { getContact } from '@/services/activecampaign/src';
import { wrapHandler } from '@/src/handler/wrapHandler';

import { fnEnvKeys } from './env';
import { eventSchema, responseSchema } from './schema';

/**
 * The handler for the `GET /foo` endpoint.
 *
 * @param event The Lambda event.
 * @param context The Lambda context.
 * @param options The handler options.
 * @returns The response.
 */
export const handler = wrapHandler(
  (event) => getContact(event.body.contactId),
  {
    eventSchema,
    fnEnvKeys,
    internal: true,
    responseSchema,
  },
);
