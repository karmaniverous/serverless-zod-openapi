import type { ZodOpenApiOperationObject } from 'zod-openapi';

import type { MakeRequired } from '@/src/types/MakeRequired';

/**
 * A base OpenAPI operation object, with the `summary` field required.
 *
 * @see https://spec.openapis.org/oas/v3.1.0#operation-object
 * @remarks
 * Use this when registering per‑function OpenAPI operations via `fn.openapi(baseOperation)`.
 * The SMOZ registry fills in `operationId`, augments `summary` with the context,
 * and merges tags for each configured context.
 */
export type BaseOperation = MakeRequired<
  Omit<ZodOpenApiOperationObject, 'operationId'>,
  'summary'
>;