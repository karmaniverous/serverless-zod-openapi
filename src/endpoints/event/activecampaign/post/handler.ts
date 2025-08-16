import { wrapHandler } from '@@/lib/handler/wrapHandler';

import { functionConfig } from './config';

export const handler = wrapHandler(async () => 'Ok', functionConfig);
