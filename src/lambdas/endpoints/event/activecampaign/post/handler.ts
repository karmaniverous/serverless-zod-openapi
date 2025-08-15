import { wrapHandler } from '@@/src/handler/wrapHandler';

import { fnEnvKeys } from './env';
import { eventSchema, responseSchema } from './schema';

export const handler = wrapHandler(
  async () => {
    return 'Ok';
  },
  {
    eventSchema,
    fnEnvKeys,
    responseSchema,
  },
);
