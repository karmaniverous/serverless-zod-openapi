import type { AWS } from '@serverless/typescript';

import type { HttpContext } from '@/src/types/HttpContext';
import type { PropFromUnion } from '@/src/types/PropFromUnion';

export type SecurityContextHttpEventMap = Record<
  HttpContext,
  Partial<
    PropFromUnion<
      PropFromUnion<PropFromUnion<AWS['functions'], string>['events'], number>,
      'http'
    >
  >
>;
