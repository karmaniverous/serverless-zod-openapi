import eslint from '@eslint/js';
import prettierPlugin from 'eslint-config-prettier';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    extends: [prettierPlugin],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.url,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSortPlugin,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-unused-vars': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
);
