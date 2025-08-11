import { wrapHandler } from '@/handler/wrapHandler';

import { envKeys } from './env';
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
  async (event, context, { logger }) => {
    const what = event.queryStringParameters.what ?? 'bar';

    logger.debug('Handler invoked with:', what);

    return { what };
  },
  {
    eventSchema,
    responseSchema,
    envKeys,
  },
);

