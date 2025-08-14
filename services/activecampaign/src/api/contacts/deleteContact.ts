import type { AxiosRequestConfig } from 'axios';

import { deleteContactRaw } from '../../wrapped/contacts';

export const deleteContact = async (
  contactId: string,
  options?: AxiosRequestConfig,
): Promise<void> => {
  await deleteContactRaw(Number(contactId), options);
};
