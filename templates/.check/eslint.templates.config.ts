import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import { dirname } from 'path';
import { defineConfig } from 'eslint';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';

// Unified ESLint config for all templates under templates/*
// - Uses projectService so type info is picked up from each template's tsconfig.json
// - ESLint drives Prettier via 'prettier/prettier': 'error'
const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  {
    ignores: [
      '**/node_modules/**',      '**/dist/**',
      '**/.tsbuild/**',
      '**/generated/**',
      '**/.check/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  prettierConfig,
  {
    languageOptions: {
      parser: tseslint.parser,      parserOptions: {
        // Let the project service discover the nearest tsconfig.json per file
        // (typed where possible; falls back to default project when unmatched).
        project: true,
        projectService: true,
        allowDefaultProject: true,
        tsconfigRootDir,
      },
    },
    plugins: {
      prettier: prettierPlugin,
      'simple-import-sort': simpleImportSortPlugin,
    },
    rules: {
      // Formatting via Prettier
      'prettier/prettier': 'error',
      // Code-quality and sorting
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-unused-vars': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      // Keep strictness reasonable for templates
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
    },
  },
]);