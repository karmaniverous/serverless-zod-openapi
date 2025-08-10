import { wrapHandler } from '@/handler/wrapHandler';

import { eventSchema, responseSchema } from './schema';

export const handler = wrapHandler(
  async (event, context, { logger }) => {
    const what = event.queryStringParameters.what ?? 'bar';
    logger.debug('Handler invoked with:', what);
    return { what };
  },
  {
    eventSchema,
    responseSchema,
  },
);
