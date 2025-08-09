import type { ZodOpenApiOperationObject } from 'zod-openapi';

import type { MakeRequired } from '@/types/MakeRequired';

export type BaseOperation = MakeRequired<
  Omit<ZodOpenApiOperationObject, 'operationId'>,
  'summary'
>;
