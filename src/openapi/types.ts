import type { ZodOpenApiOperationObject } from 'zod-openapi';

import type { MakeRequired } from '../MakeRequired';

export type SecurityContext = 'my' | 'private' | 'public';

export type Operation = MakeRequired<
  Omit<ZodOpenApiOperationObject, 'operationId'>,
  'summary'
>;
