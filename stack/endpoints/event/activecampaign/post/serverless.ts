import { buildFunctionDefinitions } from '@@/src';
import { serverlessConfig } from '@@/stack/config/serverlessConfig';

import { functionConfig } from './config';
export default buildFunctionDefinitions(
  functionConfig,
  serverlessConfig,
  import.meta.url,
);
