import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: 'src/openapi.json',
    output: {
      client: 'axios',
      mode: 'tags-split',
      target: 'api.ts',
      workspace: 'generated',
      override: {
        mutator: {
          path: '../../packages/axios/src/mutator.ts',
          name: 'orvalMutator',
        },
      },
    },
    hooks: { afterAllFilesWrite: ['prettier -w'] },
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
    hooks: { afterAllFilesWrite: ['prettier -w'] },
  },
});
