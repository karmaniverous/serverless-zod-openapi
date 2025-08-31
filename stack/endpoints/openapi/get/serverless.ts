import { buildFunctionDefinitions } from '@@/src';
import { serverlessConfig } from '@@/stack/config/serverlessConfig';
import { ENDPOINTS_ROOT_ABS } from '@@/stack/endpoints/_root';

import { functionConfig } from './config';
export default buildFunctionDefinitions(
  functionConfig,
  serverlessConfig,
  import.meta.url,
  ENDPOINTS_ROOT_ABS,
);