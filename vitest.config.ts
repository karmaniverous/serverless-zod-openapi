import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    // Avoid picking up compiled/transformed caches as test files or deps
    exclude: ['**/.tsbuild/**', '**/.rollup.cache/**'],
    // Inline alias-based imports so Vite resolves them directly instead of prebundling
    deps: {
      inline: [/^@\/.*/, /^@@\/.*/],
    },
  },
});