import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: 'src/openapi.json',
    output: {
      client: 'axios',
      mode: 'tags-split',
      target: 'api.ts',
      workspace: 'generated',
    },
    hooks: {
      afterAllFilesWrite: ['eslint --fix', 'prettier -w'],
    },
  },
  zod: {
    input: 'src/openapi.json',
    output: {
      client: 'zod',
      fileExtension: '.zod.ts',
      mode: 'tags-split',
      schemas: 'schemas',
      target: 'api.zod.ts',
      workspace: 'generated',
    },
    hooks: {
      afterAllFilesWrite: ['eslint --fix', 'prettier -w'],
    },
  },
});
