#!/usr/bin/env node
/**
 * SMOZ CLI — version/signature + register/add
 *
 * - Default: print project signature (version, Node, repo root, stanPath, config presence)
 * - register: generate app/generated/register.*.ts from app/functions/**
 * - add: scaffold a new function skeleton under app/functions
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Command } from 'commander';
import { packageDirectorySync } from 'package-directory';

import { runAdd } from './add';
import { runInit } from './init';
import { runRegister } from './register';

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
  console.log(
    `smoz.config.*: ${hasSmozJson || hasSmozYaml ? 'found' : 'absent'}`,
  );
  if (pm) console.log(`PM: ${pm}`);
};

const main = (): void => {
  const root = getRepoRoot();
  const pkg = readPkg(root);

  const program = new Command();
  program
    .name('smoz')
    .description('SMOZ CLI')
    .version(pkg.version ?? '0.0.0');

  program
    .command('add')
    .argument(
      '<spec>',
      'Add function: HTTP <eventType>/<segments...>/<method> or non-HTTP <eventType>/<segments...>',
    )
    .description('Scaffold a new function under app/functions')
    .action(async (spec: string) => {
      try {
        const { created, skipped } = await runAdd(root, spec);

        console.log(
          created.length
            ? `Created:\n - ${created.join('\n - ')}${
                skipped.length
                  ? `\nSkipped (exists):\n - ${skipped.join('\n - ')}`
                  : ''
              }`
            : 'Nothing created (files already exist).',
        );
      } catch (e) {
        console.error((e as Error).message);
        process.exitCode = 1;
      }
    });

  program
    .command('init')
    .description(
      'Scaffold a new SMOZ app from packaged templates (default: minimal)',
    )
    .option('--template <name>', 'Template name (minimal|full)', 'minimal')
    .action(async (opts: { template?: string }) => {
      try {
        const tpl =
          typeof opts.template === 'string' ? opts.template : 'minimal';
        const { created, skipped } = await runInit(root, tpl);
        console.log(
          created.length
            ? `Created:\n - ${created.join('\n - ')}${skipped.length ? `\nSkipped (exists):\n - ${skipped.join('\n - ')}` : ''}`
            : 'Nothing created (files already exist).',
        );
      } catch (e) {
        console.error((e as Error).message);
        process.exitCode = 1;
      }
    });
  program
    .command('register')
    .description(
      'Scan app/functions/** and generate app/generated/register.*.ts',
    )
    .action(async () => {
      const { wrote } = await runRegister(root);
      console.log(
        wrote.length ? `Updated:\n - ${wrote.join('\n - ')}` : 'No changes.',
      );
    });
  // Default action (no subcommand): print version + signature block
  program.action(() => {
    printSignature();
  });
  program.parse(process.argv);
};

main();
