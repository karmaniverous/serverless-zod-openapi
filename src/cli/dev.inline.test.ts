import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

// Mock built-ins before importing the module under test.
vi.mock('node:fs', () => {
  return {
    default: {
      existsSync: vi.fn(),
    },
  };
});
vi.mock('node:child_process', () => {
  return {
    spawn: vi.fn(),
    spawnSync: vi.fn(),
  };
});

describe('dev.inline: resolveTsxCommand', async () => {
  const mod = await import('@/src/cli/dev');
  const { resolveTsxCommand } = mod as unknown as {
    resolveTsxCommand: (
      root: string,
      tsEntry: string,
    ) => { cmd: string; args: string[]; shell: boolean };
  };

  const fsMod = (await import('node:fs')) as unknown as {
    default: { existsSync: ReturnType<typeof vi.fn> };
  };
  const cpMod = (await import('node:child_process')) as unknown as {
    spawnSync: ReturnType<typeof vi.fn>;
  };

  const reset = () => {
    fsMod.default.existsSync.mockReset();
    cpMod.spawnSync.mockReset();
  };

  it('prefers project-local tsx CLI (node <root>/node_modules/tsx/dist/cli.js <entry>)', () => {
    reset();
    const root = path.resolve('/', 'tmp', 'sandbox');
    const tsEntry = path.resolve(
      root,
      'src',
      'cli',
      'local',
      'inline.server',
      'index.ts',
    );
    const localCli = path
      .resolve(root, 'node_modules', 'tsx', 'dist', 'cli.js')
      .replace(/\\/g, '/');

    fsMod.default.existsSync.mockImplementation((p: unknown) => {
      const norm = String(p).replace(/\\/g, '/');
      return norm === localCli;
    });
    // PATH probe should not matter when local exists
    cpMod.spawnSync.mockReturnValue({ status: 1 } as unknown as ReturnType<
      typeof cpMod.spawnSync
    >);

    const res = resolveTsxCommand(root, tsEntry);
    expect(res.cmd).toBe(process.execPath);
    expect(res.args[0]).toEqual(localCli);
    expect(res.args[1]).toEqual(tsEntry);
    expect(res.shell).toBe(false);
  });

  it('throws a hard error when tsx is not available locally or on PATH', () => {
    reset();
    const root = path.resolve('/', 'tmp', 'sandbox');
    const tsEntry = path.resolve(
      root,
      'src',
      'cli',
      'local',
      'inline.server',
      'index.ts',
    );

    // No local tsx
    fsMod.default.existsSync.mockReturnValue(false);
    // PATH probe fails
    cpMod.spawnSync.mockReturnValue({ status: 127 } as unknown as ReturnType<
      typeof cpMod.spawnSync
    >);

    expect(() => resolveTsxCommand(root, tsEntry)).toThrow(
      /Inline requires tsx/i,
    );
  });
});
