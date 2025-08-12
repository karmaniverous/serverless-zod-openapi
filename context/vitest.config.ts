import { defineConfig, mergeConfig } from 'vitest/config';

import defaultConfig from '../vitest.config';

export default mergeConfig(
  defaultConfig,
  defineConfig({ test: { runner: 'context/test.ts', watch: false } }),
);
