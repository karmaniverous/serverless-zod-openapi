import { buildFunctionDefinitions } from '@@/lib/serverless/buildFunctionDefinitions';
import { serverlessConfig } from '@@/src/config/serverlessConfig';

import { functionConfig } from './config';

export default buildFunctionDefinitions(
  functionConfig,
  serverlessConfig,
  import.meta.url,
);
