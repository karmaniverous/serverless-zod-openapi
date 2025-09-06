/**
 * Path utilities for cross-platform hygiene.
 *
 * - toPosixPath: normalize Windows backslashes to POSIX separators.
 * - dirFromHere: resolve a directory from an import.meta.url, N levels up,
 *   returning a POSIX-normalized absolute path.
 */
import { fileURLToPath } from 'node:url';

/** Normalize a path to POSIX separators. */
export const toPosixPath = (p: string): string => p.replace(/\\/g, '/');

/**
 * Resolve a directory path relative to the current module URL and normalize it.
 *
 * @param metaUrl - typically import.meta.url
 * @param levelsUp - how many directory levels to ascend (default: 1)
 * @returns absolute, POSIX-normalized directory path
 */
export const dirFromHere = (metaUrl: string, levelsUp = 1): string => {
  // Build a URL like '../' repeated N times, resolved from metaUrl.
  const up = Array.from({ length: Math.max(0, levelsUp) })
    .map(() => '..')
    .join('/');
  const url = new URL(`${up}/`, metaUrl);
  const abs = fileURLToPath(url);
  return toPosixPath(abs);
};

