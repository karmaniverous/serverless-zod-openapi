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
    .option('--init', 'Create a minimal package.json if missing')
    .option(
      '-i, --install [pm]',
      'Install dependencies (optionally specify pm: npm|pnpm|yarn|bun)',
    )
    .option('--yes', 'Skip prompts (non-interactive)', false)
    .option('--dry-run', 'Show planned actions without writing', false)
    .action(
      async (opts: {
        template?: string;
        init?: boolean;
        install?: string | boolean;
        yes?: boolean;
        dryRun?: boolean;
      }) => {
        try {
          const tpl =
            typeof opts.template === 'string' ? opts.template : 'minimal';
          const { created, skipped, examples, merged, installed } =
            await runInit(root, tpl, opts);
          console.log(
            [
              created.length
                ? `Created:\n - ${created.join('\n - ')}`
                : 'Created: (none)',
              examples.length
                ? `Examples (existing preserved):\n - ${examples.join('\n - ')}`
                : undefined,
              skipped.length
                ? `Skipped (exists):\n - ${skipped.join('\n - ')}`
                : undefined,
              merged.length
                ? `package.json (additive):\n - ${merged.join('\n - ')}`
                : undefined,
              `Install: ${installed}`,
            ]
              .filter(Boolean)
              .join('\n'),
          );
        } catch (e) {
          console.error((e as Error).message);
          process.exitCode = 1;
        }
      },
    );
  program
    .command('register')
    .description(
      'Scan app/functions/** and generate app/generated/register.*.ts',
    )
    .option('-w, --watch', 'Watch for changes and regenerate registers')
    .action(async (opts: { watch?: boolean }) => {
      const runOnce = async () => {
        const { wrote } = await runRegister(root);
        console.log(
          wrote.length ? `Updated:\n - ${wrote.join('\n - ')}` : 'No changes.',
        );
      };
      if (!opts.watch) {
        await runOnce();
        return;
      }
      await runOnce();
      const { watchRegister } = await import('./register.watch');
      void (await watchRegister(root, runOnce));
      console.log('Watching for function registration changes...');
      // Keep process alive
      await new Promise<void>(() => {});
    });
  // Default action (no subcommand): print version + signature block
  program.action(() => {
    printSignature();
  });
  program.parse(process.argv);
};

main();
