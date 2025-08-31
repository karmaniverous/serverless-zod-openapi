import type { HttpContext } from '@/src/types/HttpContext';

export const splitPath = (basePath: string): string[] =>
  basePath.split('/').filter(Boolean);

/** Prefix non-public contexts and return path elements. */
export const buildPathElements = (
  basePath: string,
  context: HttpContext,
): string[] => {
  const parts = splitPath(sanitizeBasePath(basePath));
  return context === 'public' ? parts : [context, ...parts];
};

export const sanitizeBasePath = (p: string): string =>
  p.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
