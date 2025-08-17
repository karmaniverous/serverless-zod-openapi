import { wrapHandler } from '@@/src/config/wrapHandler';

import { functionConfig } from './config';

export const handler = wrapHandler(async () => 'Ok', functionConfig);
