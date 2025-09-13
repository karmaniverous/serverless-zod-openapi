import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { packageDirectorySync } from 'package-directory';

/**
+ * Resolve the packaged templates root from the CLI install location,
 * not the caller's project root. This makes -t <name> work both from
 * a consuming app and from this repository.
+ */
export const resolveTemplatesBase = (): string => {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgRoot = packageDirectorySync({ cwd: here }) ?? process.cwd();
  return resolve(pkgRoot, 'templates');
};

export const toPosix = (p: string): string =>
  // local helper for path presentation (not used for FS operations)
  p.replace(/\\/g, '/');
