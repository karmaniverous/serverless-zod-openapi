import { buildConfig, ConfigInputSchema, type Id, type Tag } from 'axios';

export const contactsConfigInput = {
  contacts: {
    detail: undefined,
    list: { any: undefined },
  },
} as const;

ConfigInputSchema.parse(contactsConfigInput);

export const cacheConfig = buildConfig(contactsConfigInput);

// Examples (compile-time checks)
const _t: Tag = cacheConfig.contacts.list.any.tag(); // 'contacts:list:any'
const _i: Id = cacheConfig.contacts.detail.id(123); // 'contacts:detail:123'
