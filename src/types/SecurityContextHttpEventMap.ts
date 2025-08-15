import type { AWS } from '@serverless/typescript';

import type { PropFromUnion } from '@@/src/types/PropFromUnion';
import type { SecurityContext } from '@@/src/types/SecurityContext';

export type SecurityContextHttpEventMap = Record<
  SecurityContext,
  Partial<
    PropFromUnion<
      PropFromUnion<PropFromUnion<AWS['functions'], string>['events'], number>,
      'http'
    >
  >
>;
