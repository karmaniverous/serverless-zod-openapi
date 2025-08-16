import type { AxiosRequestConfig } from '@karmaniverous/cached-axios';
import { z } from 'zod';

import type { CreateContactRequest } from '@/generated/api.schemas';
import type { Optionalize } from '@/src/types/Optionalize';
import {
  createContactRaw,
  fetchContactFieldValues,
} from '@/src/wrapped/contacts';

import { getFieldMaps, materialize } from './helpers';
import { contactSchema } from './schemas';

/** Function-specific schema & type */
export const createContactParamsSchema = z.object({
  email: z.email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

export type CreateContactParams = z.infer<typeof createContactParamsSchema>;

export const createContactOutputSchema = contactSchema;
export type CreateContactOutput = z.infer<typeof createContactOutputSchema>;

export const createContact = async (
  params: Optionalize<CreateContactParams>,
  options?: AxiosRequestConfig,
): Promise<CreateContactOutput> => {
  const input = createContactParamsSchema.parse(params);

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
  return createContactOutputSchema.parse(
    materialize(data.contact, fvals, maps),
  );
};
