import { unique } from 'radash';
import type {
  ZodOpenApiPathItemObject,
  ZodOpenApiPathsObject,
} from 'zod-openapi';

import type { SecurityContext } from '@/handler/detectSecurityContext';

import type { BaseOperation } from './types';

/**
 * Builds a path item object for OpenAPI based on the provided parameters.
 *
 * @param securityContexts - The security contexts to include in the path item.
 * @param basePath - The base path for the operation.
 * @param method - The HTTP method for the operation.
 * @param baseOperation - The base operation object to use.
 * @returns The constructed path item object.
 */
export const buildPathItemObject = (
  securityContexts: SecurityContext[],
  basePath: string,
  method: keyof Omit<ZodOpenApiPathItemObject, 'id'>,
  baseOperation: BaseOperation,
): ZodOpenApiPathsObject => {
  const basePathElements = basePath.split('/').filter(Boolean);

  return unique(securityContexts).reduce((acc, securityContext) => {
    const pathElements = [
      ...(securityContext === 'public' ? [] : [securityContext]),
      ...basePathElements,
    ];

    return {
      ...acc,
      [`/${pathElements.join('/')}`]: {
        [method]: {
          ...baseOperation,
          operationId: [...pathElements, method].join('_'),
          summary: `${baseOperation.summary} (${securityContext})`,
          tags: unique([...(baseOperation.tags ?? []), securityContext]),
        },
      },
    };
  }, {});
};
