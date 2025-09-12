import type { z } from 'zod';

import type { responseSchema } from './lambda';
import { fn } from './lambda';
// Trivial JSON stub so the endpoint returns something useful out of the box.
import doc from './openapi.stub.json';

type Response = z.infer<typeof responseSchema>;
type FnHandlerApi<T> = {
  handler: (impl: () => Promise<T> | T) => (...args: unknown[]) => Promise<T>;
};

const reg = fn as unknown as FnHandlerApi<Response>;

export const handler = reg.handler(async () => {
  // Tip: after you generate OpenAPI (npm run openapi), you may
  // import the JSON and return it instead of {}.
  await Promise.resolve(); // satisfy require-await
  const payload: unknown = doc;
  return payload;
});
