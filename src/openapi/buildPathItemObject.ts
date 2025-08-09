import { unique } from 'radash';
import type { ZodOpenApiPathItemObject } from 'zod-openapi';

import type { Operation, SecurityContext } from './types';

export const buildPathItemObject = (
  securityContexts: SecurityContext[],
  basePath: string,
  method: keyof Omit<ZodOpenApiPathItemObject, 'id'>,
  baseOperation: Operation,
): ZodOpenApiPathItemObject => {
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
