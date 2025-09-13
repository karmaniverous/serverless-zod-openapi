import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { detectPm, runInstall } from './install';

describe('init/install.detectPm', () => {
  const mk = () => mkdtempSync(join(tmpdir(), 'smoz-install-'));

  it('detects pnpm from lockfile', () => {
    const root = mk();
    try {
      writeFileSync(join(root, 'pnpm-lock.yaml'), '', 'utf8');
      expect(detectPm(root)).toBe('pnpm');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('detects yarn/npm/bun from lockfiles', () => {
    const root = mk();
    try {
      writeFileSync(join(root, 'yarn.lock'), '', 'utf8');
      expect(detectPm(root)).toBe('yarn');
      // remove yarn lock before checking npm precedence
      rmSync(join(root, 'yarn.lock'), { force: true });
      writeFileSync(join(root, 'package-lock.json'), '', 'utf8');
      expect(detectPm(root)).toBe('npm');
      // remove npm lock before checking bun precedence
      rmSync(join(root, 'package-lock.json'), { force: true });
      writeFileSync(join(root, 'bun.lockb'), '', 'utf8');
      expect(detectPm(root)).toBe('bun');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('returns undefined without hints and empty UA', () => {
    const root = mk();
    const prev = process.env.npm_config_user_agent;
    try {
      process.env.npm_config_user_agent = '';
      expect(detectPm(root)).toBeUndefined();
    } finally {
      process.env.npm_config_user_agent = prev;
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('init/install.runInstall', () => {
  it('returns unknown-pm for unsupported pm', () => {
    expect(runInstall(process.cwd(), 'foo')).toBe('unknown-pm');
  });
});
