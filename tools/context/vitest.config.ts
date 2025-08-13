import { defineConfig, mergeConfig } from 'vitest/config';

// Relative import required to support vitest cache.
import defaultConfig from '../../vitest.config';

export default mergeConfig(
  defaultConfig,
  defineConfig({ test: { runner: 'tools/context/test.ts', watch: false } }),
);
