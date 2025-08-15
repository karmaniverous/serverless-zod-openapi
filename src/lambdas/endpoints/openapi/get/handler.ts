import { wrapHandler } from '@@/src/handler/wrapHandler';
import openapi from '@@/src/openapi/openapi.json';

import { fnEnvKeys } from './env';
import { responseSchema } from './schema';

export const handler = wrapHandler(
  async () => {
    return openapi;
  },
  {
    fnEnvKeys,
    responseSchema,
  },
);
