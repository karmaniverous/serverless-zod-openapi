import type { AxiosRequestConfig } from '@karmaniverous/cached-axios';
import { z } from 'zod';

import {
  createContactRaw,
  fetchContactFieldValues,
} from '../../wrapped/contacts';
import { getFieldMaps, materialize } from './helpers';
import { type Contact } from './schemas';
import type { CreateContactRequest } from '../../../generated/api.schemas';

/** Function-specific schema & type */
export const createContactInputSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

export type CreateContactInput = z.infer<typeof createContactInputSchema>;

export const createContact = async (
  input: CreateContactInput,
  options?: AxiosRequestConfig,
): Promise<Contact> => {
  const maps = await getFieldMaps(options);

  // Build a body that satisfies generated typings (which require names/phone)
  const contactBody: CreateContactRequest['contact'] = {
    email: input.email,
    firstName: input.firstName ?? '',
    lastName: input.lastName ?? '',
    phone: input.phone ?? '',
  };

  const { data } = await createContactRaw({ contact: contactBody }, options);

  // Fetch field values and materialize with catalog for a consistent shape
  const { data: fvRes } = await fetchContactFieldValues(
    Number(data.contact.id),
    options,
  );
  const fvals = fvRes.fieldValues;
  return materialize(data.contact, fvals, maps);
};
