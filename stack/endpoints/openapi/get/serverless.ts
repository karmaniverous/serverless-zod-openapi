import { buildServerlessFunctions } from '@/src';
import { buildFnEnv } from '@/stack/config/app.config';
import { serverlessConfig } from '@/stack/config/serverlessConfig';
import { ENDPOINTS_ROOT_ABS } from '@/stack/endpoints/_root';

import { functionConfig } from './config';
export default buildServerlessFunctions(
  functionConfig,
  serverlessConfig,
  import.meta.url,
  ENDPOINTS_ROOT_ABS,
  buildFnEnv,
);