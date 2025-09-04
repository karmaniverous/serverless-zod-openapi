/* Rollup config for the SMOZ CLI (CJS bin with shebang). */
import { builtinModules } from 'node:module';

import typescript from '@rollup/plugin-typescript';

const externals = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
  // Treat runtime deps as external (no bundling)
  'package-directory',
  'commander',
]);

export default {
  input: 'src/cli/index.ts',
  output: {
    file: 'dist/cli/index.cjs',
    format: 'cjs',
    banner: '#!/usr/bin/env node',
    sourcemap: false,
  },
  external: (id: string) => {
    if (externals.has(id)) return true;
    if (id.startsWith('node:')) return true;
    // Keep subpath externals
    if (id === 'package-directory' || id.startsWith('package-directory/'))
      return true;
    return false;
  },
  plugins: [typescript({ tsconfig: 'tsconfig.rollup.json' })],
};
