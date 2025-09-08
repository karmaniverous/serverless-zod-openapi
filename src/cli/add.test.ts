/* REQUIREMENTS ADDRESSED (TEST)
- CLI add: scaffolds HTTP and non-HTTP trees idempotently with expected files.
*/
import { mkdtempSync, rmSync } from 'node:fs';
import { existsSync } from 'node:fs';
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
