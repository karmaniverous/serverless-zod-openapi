/* See <stanPath>/system/stan.project.md for global requirements.
 * Requirements addressed:
 * - Minimal library bundling: ESM + CJS outputs.
 * - Generate a single type declarations bundle at dist/index.d.ts.
 * - Keep runtime dependencies and Node built-ins external.
 * - No unnecessary plugins (no alias/replace/resolve/commonjs/json/terser).
 */
import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import typescriptPlugin from '@rollup/plugin-typescript';
import type {
  InputOptions,
  OutputOptions,
  Plugin,
  RollupLog,
  RollupOptions,
} from 'rollup';
import dtsPlugin from 'rollup-plugin-dts';

const outputPath = 'dist';

// Multi-entry mapping to produce subpath bundles for JS and DTS.
const entryPoints = {
  index: 'src/index.ts',
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Collect runtime dependency names (dependencies + peerDependencies) to mark as external.
let runtimeExternalPkgs = new Set<string>();
try {
  const pkgJsonText = readFileSync(
    path.resolve(__dirname, 'package.json'),
    'utf8',
  );
  const parsedUnknown: unknown = JSON.parse(pkgJsonText);
  if (typeof parsedUnknown === 'object' && parsedUnknown !== null) {
    const deps =
      (parsedUnknown as { dependencies?: Record<string, string> })
        .dependencies ?? {};
    const peers =
      (parsedUnknown as { peerDependencies?: Record<string, string> })
        .peerDependencies ?? {};
    runtimeExternalPkgs = new Set<string>([
      ...Object.keys(deps),
      ...Object.keys(peers),
    ]);
  }
} catch {
  // noop — external set stays empty
}

// Treat Node built-ins and node: specifiers as external.
const nodeExternals = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]);

const makePlugins = (tsconfigPath?: string): Plugin[] => [
  typescriptPlugin({
    // Do not write transpiled output to disk; let Rollup handle bundling.
    outputToFilesystem: false,
    // Allow a custom tsconfig for specialized builds (e.g., stan:build).
    tsconfig: tsconfigPath ?? false,
    // Override conflicting tsconfig flags for bundling. Declarations are produced by rollup-plugin-dts.
    compilerOptions: {
      declaration: false,
      emitDeclarationOnly: false,
      noEmit: false,
      sourceMap: false,
      // outDir intentionally not set here; provided by custom tsconfig when needed.
    },
  }),
];

const commonInputOptions = (tsconfigPath?: string): InputOptions => ({
  plugins: makePlugins(tsconfigPath),
  onwarn(warning: RollupLog, defaultHandler: (w: RollupLog) => void) {
    // Suppress unresolved import warnings for alias externals that we
    // intentionally mark as external for specialized builds (stan:build).
    // This keeps the build output clean without altering bundling behavior.
    // See external() below where '@/' and '@@/' are treated as external.
    try {
      const code = (warning as unknown as { code?: string }).code;
      const source = (warning as unknown as { source?: unknown }).source;
      if (
        code === 'UNRESOLVED_IMPORT' &&
        typeof source === 'string' &&
        (source.startsWith('@/') || source.startsWith('@@/'))
      ) {
        return;
      }
    } catch {
      // Fall through to default handler on any unexpected shape
    }
    defaultHandler(warning);
  },
  external: (id) =>
    // Treat alias imports as external to avoid noisy unresolved warnings in specialized builds.    id.startsWith('@/') ||
    id.startsWith('@@/') ||
    nodeExternals.has(id) ||
    Array.from(runtimeExternalPkgs).some(
      (p) => id === p || id.startsWith(`${p}/`),
    ),
});
const outCommon = (dest: string): OutputOptions[] => [
  { dir: `${dest}/mjs`, format: 'esm', sourcemap: false },
  { dir: `${dest}/cjs`, format: 'cjs', sourcemap: false },
];

export const buildLibrary = (
  dest: string,
  tsconfigPath?: string,
): RollupOptions => ({
  input: entryPoints,
  output: outCommon(dest),
  ...commonInputOptions(tsconfigPath),
});

export const buildTypes = (dest: string): RollupOptions => ({
  input: entryPoints,
  // Emit declaration files for all entry points at `dist/`, producing:
  // - dist/index.d.ts
  // - dist/mutators/orval.d.ts
  // - dist/mutators/index.d.ts
  output: { dir: dest, format: 'es' },
  plugins: [dtsPlugin()],
});

export default [buildLibrary(outputPath, 'tsconfig.rollup.json'), buildTypes(outputPath)];
