import type { ZodOpenApiOperationObject } from 'zod-openapi';

import type { MakeRequired } from '@@/lib/types/MakeRequired';

/**
 * A base OpenAPI operation object, with the `summary` field required.
 *
 * @see https://spec.openapis.org/oas/v3.1.0#operation-object
 */
export type BaseOperation = MakeRequired<
  Omit<ZodOpenApiOperationObject, 'operationId'>,
  'summary'
>;
