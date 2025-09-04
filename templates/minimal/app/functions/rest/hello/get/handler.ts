import type { z } from 'zod';

import type { responseSchema } from './lambda';
import { fn } from './lambda';

type Response = z.infer<typeof responseSchema>;

export const handler = fn.handler(async () => {
  const res: Response = { ok: true };
  return res;
});
