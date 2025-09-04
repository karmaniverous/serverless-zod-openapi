import eslint from '@eslint/js';
import type { Rule } from 'eslint';
import prettierConfig from 'eslint-config-prettier';
import eslintComments from 'eslint-plugin-eslint-comments';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.serverless/**',
      '.tsbuild/**',
      'coverage/**',
      'dist/**',
      'docs/**',
      'node_modules/**'
    ]
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  prettierConfig,
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json']
      }
    },
    plugins: {
      'eslint-comments': (eslintComments as unknown as { rules?: Record<string, Rule.RuleModule> }),
      prettier: prettierPlugin,
      'simple-import-sort': simpleImportSortPlugin
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-unused-vars': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'eslint-comments/no-unlimited-disable': 'error'
    }
  }
);
