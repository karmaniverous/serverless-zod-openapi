import type { AxiosRequestConfig } from '@karmaniverous/cached-axios';

import type { ACContact } from '../../wrapped/contacts';
import {
  fetchContactCore,
  fetchContactFieldValues,
} from '../../wrapped/contacts';
import { getFieldMaps, materialize } from './helpers';
import { type Contact, contactSchema } from './schemas';

export const getContact = async (
  contactId: string,
  options?: AxiosRequestConfig,
): Promise<Contact | undefined> => {
  const [{ data: coreRes }, { data: fvRes }, maps] = await Promise.all([
    fetchContactCore(contactId, options),
    fetchContactFieldValues(Number(contactId), options),
    getFieldMaps(options),
  ]);
  const core = coreRes.contact as ACContact | undefined;
  if (!core) return undefined;
  const fvals = fvRes.fieldValues;
  return contactSchema.parse(materialize(core, fvals, maps));
};
