import eslint from '@eslint/js';
// Narrow the plugin value so TypeScript accepts it in the plugins map.
import type { Rule } from 'eslint';
import prettierConfig from 'eslint-config-prettier';
import eslintComments from 'eslint-plugin-eslint-comments';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import { dirname } from 'path';import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));
export default tseslint.config(
  {
    ignores: [
      '.serverless/**',
      '.stan/**',
      '**/.tsbuild/**',
      '**/generated/**',
      'coverage/**',
      'dist/**',
      'docs/**',
      'node_modules/**',
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  prettierConfig,
  {
    languageOptions: {
      // Important: set the TS parser here, otherwise this block replaces the
      // parser from strictTypeChecked and the CLI falls back to espree.
      parser: tseslint.parser,
      parserOptions: {
        // Be explicit so the CLI loads type info from the root project.
        project: ['./tsconfig.json'],
        tsconfigRootDir,
      },
    },
    // eslint: flat config plugin registry
    // Provide the comments plugin with a narrowed shape (rules only) to satisfy TS.
    plugins: {
      'eslint-comments': (eslintComments as unknown as { rules?: Record<string, Rule.RuleModule> }),
      prettier: prettierPlugin,
      'simple-import-sort': simpleImportSortPlugin,
    },    rules: {      // Code-quality and sorting
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/require-await': 'off',
      'no-unused-vars': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      /**
       * Safety policy (no inline disables without justification):       * - Keep unsafe rules explicit and enforced. Prefer typed narrowing,
       *   precise generics, and explicit assertions at well-documented seams
       *   instead of broad rule suppression.
       * - If a specific location requires an assertion, document why at the site.
       */
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      // Enforce documented, narrowly scoped disables
      // - Require a human-readable description on any disable pragma
      // - Forbid blanket unlimited disables
      // - Forbid stale/unused disables
      'eslint-comments/require-description': ['error', { ignore: [] }], // array form required by ESLint
      'eslint-comments/no-unlimited-disable': 'error',
      'eslint-comments/no-unused-disable': 'error',
    },  },
);
