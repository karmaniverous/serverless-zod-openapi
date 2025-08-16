import { wrapHandler } from '@@/lib/handler/wrapHandler';
import { getContact } from '@@/services/activecampaign/src';

import { functionConfig } from './config';

export const handler = wrapHandler(
  (event) => getContact({ contactId: event.body.contactId }),
  functionConfig,
);
