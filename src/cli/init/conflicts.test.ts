import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';

import { describe, expect, it } from 'vitest';

import { copyDirWithConflicts } from './conflicts';

const mkSand = (name: string) => mkdtempSync(join(tmpdir(), `smoz-${name}-`));

describe('init/conflicts.copyDirWithConflicts', () => {
  it('creates files when absent', async () => {
    const src = mkSand('src');
    const dst = mkSand('dst');
    try {
      const sub = join(src, 'a', 'b.txt');
      mkdirSync(dirname(sub), { recursive: true });
      writeFileSync(sub, 'one', 'utf8');
      const created: string[] = [];
      const skipped: string[] = [];
      const examples: string[] = [];
      await copyDirWithConflicts(src, dst, created, skipped, examples, {
        conflict: 'overwrite',
      });
      const outPath = join(dst, 'a', 'b.txt');
      expect(existsSync(outPath)).toBe(true);
      expect(created).toContain(posix.normalize(outPath));
      expect(skipped).toEqual([]);
      expect(examples).toEqual([]);
    } finally {
      rmSync(src, { recursive: true, force: true });
      rmSync(dst, { recursive: true, force: true });
    }
  });

  it('writes .example on conflict when policy=example', async () => {
    const src = mkSand('src');
    const dst = mkSand('dst');
    try {
      const fileRel = join('a', 'b.txt');
      const srcFile = join(src, fileRel);
      const dstFile = join(dst, fileRel);
      mkdirSync(dirname(srcFile), { recursive: true });
      mkdirSync(dirname(dstFile), { recursive: true });
      // prepare src/dst
      writeFileSync(srcFile, 'two', 'utf8');
      writeFileSync(dstFile, 'one', 'utf8');
      const created: string[] = [];
      const skipped: string[] = [];
      const examples: string[] = [];
      await copyDirWithConflicts(src, dst, created, skipped, examples, {
        conflict: 'example',
      });
      const ex = `${dstFile}.example`;
      expect(existsSync(ex)).toBe(true);
      expect(readFileSync(dstFile, 'utf8')).toBe('one'); // original preserved
      expect(examples).toContain(posix.normalize(ex));
    } finally {
      rmSync(src, { recursive: true, force: true });
      rmSync(dst, { recursive: true, force: true });
    }
  });

  it('overwrites on conflict when policy=overwrite', async () => {
    const src = mkSand('src');
    const dst = mkSand('dst');
    try {
      const fileRel = join('a', 'b.txt');
      const srcFile = join(src, fileRel);
      const dstFile = join(dst, fileRel);
      mkdirSync(dirname(srcFile), { recursive: true });
      mkdirSync(dirname(dstFile), { recursive: true });
      // prepare src/dst
      writeFileSync(srcFile, 'new', 'utf8');
      // ensure directory exists and conflicting file present
      writeFileSync(dstFile, 'old', 'utf8');
      const created: string[] = [];
      const skipped: string[] = [];
      const examples: string[] = [];
      await copyDirWithConflicts(src, dst, created, skipped, examples, {
        conflict: 'overwrite',
      });
      expect(readFileSync(dstFile, 'utf8')).toBe('new');
      expect(created).toContain(posix.normalize(dstFile));
    } finally {
      rmSync(src, { recursive: true, force: true });
      rmSync(dst, { recursive: true, force: true });
    }
  });

  it('skips on conflict when policy=skip', async () => {
    const src = mkSand('src');
    const dst = mkSand('dst');
    try {
      const fileRel = join('a', 'b.txt');
      const srcFile = join(src, fileRel);
      const dstFile = join(dst, fileRel);
      mkdirSync(dirname(srcFile), { recursive: true });
      mkdirSync(dirname(dstFile), { recursive: true });
      // prepare src/dst
      writeFileSync(srcFile, 'incoming', 'utf8');
      writeFileSync(dstFile, 'existing', 'utf8');
      const created: string[] = [];
      const skipped: string[] = [];
      const examples: string[] = [];
      await copyDirWithConflicts(src, dst, created, skipped, examples, {
        conflict: 'skip',
      });
      expect(readFileSync(dstFile, 'utf8')).toBe('existing');
      expect(skipped).toContain(posix.normalize(dstFile));
      expect(examples).toEqual([]);
      expect(created).toEqual([]);
    } finally {
      rmSync(src, { recursive: true, force: true });
      rmSync(dst, { recursive: true, force: true });
    }
  });
});
