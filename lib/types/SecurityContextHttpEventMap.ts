import type { AWS } from '@serverless/typescript';

import type { HttpContext } from '@@/lib/types/HttpContext';
import type { PropFromUnion } from '@@/lib/types/PropFromUnion';

export type SecurityContextHttpEventMap = Record<
  HttpContext,
  Partial<
    PropFromUnion<
      PropFromUnion<PropFromUnion<AWS['functions'], string>['events'], number>,
      'http'
    >
  >
>;
