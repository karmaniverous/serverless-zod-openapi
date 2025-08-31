import { buildFunctionDefinitions } from '@@/src/serverless/buildFunctionDefinitions';
import { serverlessConfig } from '@@/stack/config/serverlessConfig';

import { functionConfig } from './config';

export default buildFunctionDefinitions(
  functionConfig,
  serverlessConfig,
  import.meta.url,
);
