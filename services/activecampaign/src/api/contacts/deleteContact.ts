import type { AxiosRequestConfig } from '@karmaniverous/cached-axios';
import { z } from 'zod';

import type { Optionalize } from '@/src/types/Optionalize';
import { deleteContactRaw } from '@/src/wrapped/contacts';

export const deleteContactParamsSchema = z.object({
  contactId: z.union([z.string(), z.number()]),
});

export type DeleteContactParams = z.infer<typeof deleteContactParamsSchema>;

export const deleteContactOutputSchema = z.void();
export type DeleteContactOutput = z.infer<typeof deleteContactOutputSchema>;

export const deleteContact = async (
  params: Optionalize<DeleteContactParams>,
  options?: AxiosRequestConfig,
): Promise<DeleteContactOutput> => {
  const { contactId } = deleteContactParamsSchema.parse(params);
  await deleteContactRaw(Number(contactId), options);
};
