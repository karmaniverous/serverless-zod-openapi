import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { seedRegisterPlaceholders } from './seed';

describe('init/seed.seedRegisterPlaceholders', () => {
  it('creates placeholders, then skips when present', async () => {
    const root = mkdtempSync(join(tmpdir(), 'smoz-seed-'));
    try {
      const first = await seedRegisterPlaceholders(root);
      // Files created
      const gen = join(root, 'app', 'generated');
      expect(existsSync(join(gen, 'register.functions.ts'))).toBe(true);
      expect(existsSync(join(gen, 'register.openapi.ts'))).toBe(true);
      expect(existsSync(join(gen, 'register.serverless.ts'))).toBe(true);
      expect(first.created.length).toBe(3);
      expect(first.skipped.length).toBe(0);
      // Second run skips
      const second = await seedRegisterPlaceholders(root);
      expect(second.created.length).toBe(0);
      expect(second.skipped.length).toBe(3);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
