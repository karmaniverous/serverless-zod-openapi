import { wrapHandler } from '@@/src/handler/wrapHandler';
import openapi from '@@/src/openapi/openapi.json';

import { fnEnvKeys } from './env';
import { responseSchema } from './schema';

/**
 * The handler for the `GET /foo` endpoint.
 *
 * @param event The Lambda event.
 * @param context The Lambda context.
 * @param options The handler options.
 * @returns The response.
 */
export const handler = wrapHandler(
  async () => {
    return openapi;
  },
  {
    fnEnvKeys,
    responseSchema,
  },
);
