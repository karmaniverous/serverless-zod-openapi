import { dirname, relative } from 'path';
import { packageDirectorySync } from 'pkg-dir';
import { fileURLToPath } from 'url';

export const modulePathFromRoot = (importMetaUrl: string) =>
  relative(
    packageDirectorySync()!,
    dirname(fileURLToPath(importMetaUrl)),
  ).replace(/\\/g, '/');
