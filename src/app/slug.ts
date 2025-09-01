import { dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Derive a stable, lowercase, POSIX slug from module location.
 * - Based on caller module directory relative to endpoints root.
 * - Sanitizes to safe characters, collapses repeats, trims ends.
 */
export const deriveSlug = (
  endpointsRootAbs: string,
  callerModuleUrl: string,
): string => {
  const rel = relative(
    endpointsRootAbs,
    dirname(fileURLToPath(callerModuleUrl)),
  )
    .split(sep)
    .join('/')
    .toLowerCase();

  return rel
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/-+/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '');
};

export default deriveSlug;
