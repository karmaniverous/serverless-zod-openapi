import { z } from 'zod';

export const responseSchema = z
  .object({})
  .loose()
  .meta({ ref: 'OpenapiGetResponse' });
