import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ensureToolkitDependency, mergeAdditive } from './manifest';

describe('init/manifest.mergeAdditive', () => {
  it('merges only missing deps/peer/dev and aliases differing scripts', () => {
    const target: Record<string, unknown> = {
      dependencies: { a: '^1.0.0' },
      devDependencies: { jest: '^1.0.0' },
      scripts: { build: 'rollup -c', test: 'vitest' },
    };
    const source: Record<string, unknown> = {
      dependencies: { a: '^1.0.0', b: '^2.0.0' },
      devDependencies: { ts: '^5.0.0' },
      peerDependencies: { peer1: '^1.2.3' },
      scripts: { build: 'tsup', lint: 'eslint .' },
    };

    const merged = mergeAdditive(target, source);
    // New deps/dev/peer merged
    expect(merged).toEqual(
      expect.arrayContaining([
        'dependencies:b@^2.0.0',
        'devDependencies:ts@^5.0.0',
        'peerDependencies:peer1@^1.2.3',
        'scripts:lint',
        'scripts:build:smoz',
      ]),
    );
    // Existing build kept and alias created
    const scripts = target.scripts as Record<string, string>;
    expect(scripts.build).toBe('rollup -c');
    expect(scripts['build:smoz']).toBe('tsup');
    // Lint added
    expect(scripts.lint).toBe('eslint .');
  });
});

describe('init/manifest.ensureToolkitDependency', () => {
  it('injects @karmaniverous/smoz with caret version from toolkit package', async () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'smoz-manifest-'));
    try {
      // toolkitRoot/package.json with a version; templatesBase = <toolkitRoot>/templates
      writeFileSync(
        join(sandbox, 'package.json'),
        JSON.stringify({ name: '@karmaniverous/smoz', version: '9.9.9' }),
        'utf8',
      );
      const templatesBase = join(sandbox, 'templates');

      const pkg: Record<string, unknown> = {};
      const added = await ensureToolkitDependency(pkg, templatesBase);
      expect(added).toBe('dependencies:@karmaniverous/smoz@^9.9.9');
      const deps = pkg.dependencies as Record<string, string>;
      expect(deps['@karmaniverous/smoz']).toBe('^9.9.9');

      // second run: no change
      const added2 = await ensureToolkitDependency(pkg, templatesBase);
      expect(added2).toBeUndefined();
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
