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
  async (event, context, { env, logger }) => {
    const what = event.queryStringParameters.what ?? 'bar';

    // @ts-expect-error - Not an exposed env var.
    logger.debug('Test global:', env.TEST_GLOBAL);
    logger.debug('Test global env:', env.TEST_GLOBAL_ENV);
    // @ts-expect-error - Not an exposed env var.
    logger.debug('Test stage:', env.TEST_STAGE);
    logger.debug('Test stage env:', env.TEST_STAGE_ENV);
    logger.debug('Handler invoked with:', what);
    logger.debug('Handler invoked with:', what);

    return { what };
  },
  {
    eventSchema,
    responseSchema,
    envKeys,
  },
);

