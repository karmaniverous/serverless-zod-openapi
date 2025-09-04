import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import { dirname } from 'path';
import tseslint from 'typescript-eslint';
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
    },    plugins: {
      prettier: prettierPlugin,
      'simple-import-sort': simpleImportSortPlugin,
    },
    rules: {
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
       * Safety policy (no inline disables without justification):
       * - Keep unsafe rules explicit and enforced. Prefer typed narrowing,
       *   precise generics, and explicit assertions at well-documented seams
       *   instead of broad rule suppression.
       * - If a specific location requires an assertion, document why at the site.
       */
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
    },
  },
);