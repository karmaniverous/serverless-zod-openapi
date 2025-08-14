import { buildConfig, ConfigInputSchema } from '@karmaniverous/cached-axios';

export const contactsConfigInput = {
  contacts: {
    detail: undefined,
    list: { any: undefined },
  },
} as const;

ConfigInputSchema.parse(contactsConfigInput);

export const cacheConfig = buildConfig(contactsConfigInput);
