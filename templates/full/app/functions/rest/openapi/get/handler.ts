import type { z } from 'zod';

import type { responseSchema } from './lambda';
import { fn } from './lambda';

type Response = z.infer<typeof responseSchema>;

type FnHandlerApi<T> = {
  handler: (impl: () => Promise<T> | T) => (...args: unknown[]) => Promise<T>;
};

const reg = fn as unknown as FnHandlerApi<Response>;

export const handler = reg.handler(async () => {
  // After generating OpenAPI, you can import and return the JSON here.
  return {} as Response;
});
