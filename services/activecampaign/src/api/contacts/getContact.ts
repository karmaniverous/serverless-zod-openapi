import type { AxiosRequestConfig } from '@karmaniverous/cached-axios';
import { z } from 'zod';

import type { Optionalize } from '@@/src/types/Optionalize';
import type { ACContact } from '@@/src/wrapped/contacts';
import {
  fetchContactCore,
  fetchContactFieldValues,
} from '@@/src/wrapped/contacts';

import { getFieldMaps, materialize } from './helpers';
import { contactSchema } from './schemas';

export const getContactParamsSchema = z.object({
  contactId: z.string().min(1),
});

export type GetContactParams = z.infer<typeof getContactParamsSchema>;

export const getContactOutputSchema = contactSchema.optional();
export type GetContactOutput = z.infer<typeof getContactOutputSchema>;

export const getContact = async (
  params: Optionalize<GetContactParams>,
  options?: AxiosRequestConfig,
): Promise<GetContactOutput> => {
  const { contactId } = getContactParamsSchema.parse(params);

  const [{ data: coreRes }, { data: fvRes }, maps] = await Promise.all([
    fetchContactCore(contactId, options),
    fetchContactFieldValues(Number(contactId), options),
    getFieldMaps(options),
  ]);
  const core = coreRes.contact as ACContact | undefined;
  if (!core) return undefined;
  const fvals = fvRes.fieldValues;
  return getContactOutputSchema.parse(materialize(core, fvals, maps));
};
