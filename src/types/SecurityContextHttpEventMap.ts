import type { AWS } from '@serverless/typescript';

import type { HttpContext } from '@/src/types/HttpContext';
import type { PropFromUnion } from '@/src/types/PropFromUnion';

/**
 * Opaque Serverless event fragments keyed by security context.
 *
 * @remarks
 * Shape is intentionally platform‑specific; used by the App to decorate
 * generated HTTP events based on 'my' | 'private' | 'public' contexts.
 */
export type SecurityContextHttpEventMap = Record<
  HttpContext,
  Partial<
    PropFromUnion<
      PropFromUnion<PropFromUnion<AWS['functions'], string>['events'], number>,
      'http'
    >
  >
>;
