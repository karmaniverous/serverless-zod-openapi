/**
 * REQUIREMENTS ADDRESSED
 * - Non-HTTP step function: no HTTP middleware should be applied.
 * - Call makeWrapHandler with only (functionConfig, businessHandler).
 */
import { makeWrapHandler } from '@@/lib/handler/makeWrapHandler';
import { getContact } from '@@/services/activecampaign/src';

import { functionConfig } from './config';

export const handler = makeWrapHandler(functionConfig, (event) =>
  getContact({ contactId: event.Payload.contactId }),
);
