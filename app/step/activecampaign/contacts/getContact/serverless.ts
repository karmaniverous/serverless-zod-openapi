import { buildFnEnv } from '@/app/config/app.config';
import { serverlessConfig } from '@/app/config/serverlessConfig';
import { ENDPOINTS_ROOT_ABS } from '@/app/endpoints/_root';
import { buildServerlessFunctions } from '@/src';

import { functionConfig } from './config';
export default buildServerlessFunctions(
  functionConfig,
  serverlessConfig,
  import.meta.url,
  ENDPOINTS_ROOT_ABS,
  buildFnEnv,
);
