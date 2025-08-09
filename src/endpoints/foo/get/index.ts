import { wrapHandler } from '@/handler/wrapHandler';

import { eventSchema, responseSchema } from './schema';

export const handler = wrapHandler(
  ({ queryStringParameters: { what } }, context, { logger }) => {
    logger.debug('Handler invoked with what:', what);
    return { what };
  },
  {
    eventSchema,
    responseSchema,
  },
);
