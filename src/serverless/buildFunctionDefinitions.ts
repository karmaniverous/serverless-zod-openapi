import type { AWS } from '@serverless/typescript';

import type { SecurityContext } from '@@/src/types/SecurityContext';
import type { SecurityContextHttpEventMap } from '@@/src/types/SecurityContextHttpEventMap';

// TODO: Implement the logic to build function definitions based on contexts and map
export const buildFunctionDefinitions = (
  functions: AWS['functions'] = {},
  contexts?: SecurityContext[],
  map?: SecurityContextHttpEventMap,
): AWS['functions'] => {
  if (contexts && !map)
    throw new Error('If contexts are provided then map is required.');

  return functions;
};
