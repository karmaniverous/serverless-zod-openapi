#!/usr/bin/env node
/**
 * SMOZ CLI — slice 1 (version/signature)
 *
 * Prints CLI version, Node version, repo root, stanPath detection, and presence
 * of app/config/app.config.ts and smoz.config.*. Additional commands will be
 * added in subsequent slices (register, add, init).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Command } from 'commander';
import { packageDirectorySync } from 'package-directory';

type Pkg = { name?: string; version?: string };

const getRepoRoot = (): string => packageDirectorySync() ?? process.cwd();

const readPkg = (root: string): Pkg => {
  try {
    const raw = readFileSync(join(root, 'package.json'), 'utf8');
    return JSON.parse(raw) as Pkg;
  } catch {
    return {};
  }
};

const detectPackageManager = (): string | undefined => {
  const ua = process.env.npm_config_user_agent ?? '';
  if (ua.includes('pnpm')) return 'pnpm';
  if (ua.includes('yarn')) return 'yarn';
  if (ua.includes('npm')) return 'npm';
  return ua || undefined;
};

const detectStanPath = (root: string): string => {
  // Keep this conservative; future: read stan.config.* if introduced.
  const candidate = '.stan';
  if (existsSync(join(root, candidate, 'system', 'stan.system.md'))) {
    return candidate;
  }
  return candidate; // default
};

const printSignature = (): void => {
  const root = getRepoRoot();
  const pkg = readPkg(root);
  const name = pkg.name ?? 'smoz';
  const version = pkg.version ?? '0.0.0';
  const pm = detectPackageManager();
  const stanPath = detectStanPath(root);
  const hasAppConfig = existsSync(join(root, 'app', 'config', 'app.config.ts'));
  const hasSmozJson = existsSync(join(root, 'smoz.config.json'));
  const hasSmozYaml =
    existsSync(join(root, 'smoz.config.yml')) ||
    existsSync(join(root, 'smoz.config.yaml'));

   
  console.log(`${name} v${version}`);
  console.log(`Node ${process.version}`);
  console.log(`Repo: ${root}`);
  console.log(`stanPath: ${stanPath}`);
  console.log(
    `app/config/app.config.ts: ${hasAppConfig ? 'found' : 'missing'}`,
  );
  console.log(`smoz.config.*: ${hasSmozJson || hasSmozYaml ? 'found' : 'absent'}`);
  if (pm) console.log(`PM: ${pm}`);
   
};

const main = (): void => {
  const root = getRepoRoot();
  const pkg = readPkg(root);

  const program = new Command();
  program.name('smoz').description('SMOZ CLI').version(pkg.version ?? '0.0.0');

  // Default action (no subcommand): print version + signature block
  program.action(() => {
    printSignature();
  });

  program.parse(process.argv);
};

main();