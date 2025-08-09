import { unique } from 'radash';
import type {
  ZodOpenApiPathItemObject,
  ZodOpenApiPathsObject,
} from 'zod-openapi';

import type { SecurityContext } from '@/handler/SecurityContext';

import type { BaseOperation } from './types';

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
