/* REQUIREMENTS ADDRESSED (TEST)
- CLI add: scaffolds HTTP and non-HTTP trees idempotently with expected files.
*/
import { mkdtempSync, rmSync } from 'node:fs';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runAdd } from '@/src/cli/add';

describe('CLI: add', () => {
  it('scaffolds HTTP and non-HTTP trees and is idempotent', async () => {
    const root = mkdtempSync(join(tmpdir(), 'smoz-add-'));
    try {
      // HTTP example
      const http = await runAdd(root, 'rest/foo/get');
      expect(http.created.length).toBeGreaterThan(0);
      // Verify some files exist
      const httpBase = join(root, 'app', 'functions', 'rest', 'foo', 'get');
      expect(existsSync(join(httpBase, 'lambda.ts'))).toBe(true);
      expect(existsSync(join(httpBase, 'handler.ts'))).toBe(true);
      expect(existsSync(join(httpBase, 'openapi.ts'))).toBe(true);
      // Second run should skip the same files
      const http2 = await runAdd(root, 'rest/foo/get');
      expect(http2.created.length).toBe(0);
      expect(http2.skipped.length).toBeGreaterThanOrEqual(1);

      // Path parameter example (accepts :id form; writes [id] dir; emits {id} in code/docs)
      const pp = await runAdd(root, 'rest/users/:id/get');
      void pp; // created/skipped counts not asserted here; we assert artifacts
      const ppBase = join(
        root,
        'app',
        'functions',
        'rest',
        'users',
        '[id]',
        'get',
      );
      expect(existsSync(ppBase)).toBe(true);
      // lambda.ts: basePath uses {id}
      const lambdaBody = readFileSync(join(ppBase, 'lambda.ts'), 'utf8');
      expect(lambdaBody).toMatch(/basePath:\s*'users\/\{id\}'/);
      // openapi.ts: parameters entry and Path template hint
      const oaiBody = readFileSync(join(ppBase, 'openapi.ts'), 'utf8');
      // Path template hint
      expect(oaiBody).toMatch(/Path template:\s*\/users\/\{id\}/);
      // Parameters array contains id in: path
      expect(oaiBody).toMatch(
        /\{\s*name:\s*'id',\s*in:\s*'path',\s*required:\s*true,\s*schema:\s*\{\s*type:\s*'string'\s*\}/,
      );
      // handler.ts exists as usual
      expect(existsSync(join(ppBase, 'handler.ts'))).toBe(true);
      // idempotence on path param spec
      const pp2 = await runAdd(root, 'rest/users/:id/get');
      expect(pp2.created.length).toBe(0);
      // Non-HTTP example
      await runAdd(root, 'step/activecampaign/contacts/getContact');
      const nonBase = join(
        root,
        'app',
        'functions',
        'step',
        'activecampaign',
        'contacts',
        'getContact',
      );
      expect(existsSync(join(nonBase, 'lambda.ts'))).toBe(true);
      expect(existsSync(join(nonBase, 'handler.ts'))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
