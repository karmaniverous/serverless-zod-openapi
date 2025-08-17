import { wrapHandler } from '@@/src/config/wrapHandler';
import { getContact } from '@@/services/activecampaign/src';

import { functionConfig } from './config';

export const handler = wrapHandler(
  (event) => getContact({ contactId: event.Payload.contactId }),
  functionConfig,
);
