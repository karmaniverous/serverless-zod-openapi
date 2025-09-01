/**
 * REQUIREMENTS ADDRESSED
 * - Non-HTTP step function: no HTTP middleware should be applied.
 * - Call wrapHandler with (functionConfig, businessHandler).
 */
import { getContact } from '@/services/activecampaign/src';

import { fn } from './lambda';

export const handler = fn.handler(async (event) => {
  const e = event as { Payload: { contactId: string } };
  const id = e?.Payload?.contactId;
  return getContact({ contactId: id });
});