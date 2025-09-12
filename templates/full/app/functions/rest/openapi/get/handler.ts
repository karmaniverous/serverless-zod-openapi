import type { z } from 'zod';

import openapiDoc from '@/app/generated/openapi.json';

import type { responseSchema } from './lambda';
import { fn } from './lambda';

type Response = z.infer<typeof responseSchema>;

type FnHandlerApi<T> = {
  handler: (impl: () => Promise<T> | T) => (...args: unknown[]) => Promise<T>;
};

const reg = fn as unknown as FnHandlerApi<Response>;

export const handler = reg.handler(async () => {
  // Trivial await to mirror minimal template style
  await Promise.resolve();
  return openapiDoc as unknown;
});
