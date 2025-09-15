/**
 * SMOZ CLI — version/signature + register/add
 *
 * - Default: print project signature (version, Node, repo root, stanPath, config presence) * - register: one-shot — generate app/generated/register.*.ts from app/functions/**
 * - openapi: one-shot — run the project’s OpenAPI builder
 * - dev: watch loop orchestrator for register/openapi and optional local serving
 * - add: scaffold a new function skeleton under app/functions
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Command } from 'commander';
import { packageDirectorySync } from 'package-directory';

import { runAdd } from './add';
import { runDev } from './dev/index';
import { runInit } from './init';
import { runOpenapi } from './openapi';
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

type SmozConfig = {
  cliDefaults?: {
    init?: {
      onConflict?: 'ask' | 'overwrite' | 'example' | 'skip';
      install?: 'auto' | 'none' | 'npm' | 'pnpm' | 'yarn' | 'bun';
      template?: string;
    };
    dev?: {
      local?: 'inline' | 'offline';
    };
  };
};
const readSmozConfig = (root: string): SmozConfig => {
  try {
    const p = join(root, 'smoz.config.json');
    if (!existsSync(p)) return {};
    const raw = readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as SmozConfig;
    }
    return {};
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
    // Add -v alias for version in addition to default --version behavior
    .version(pkg.version ?? '0.0.0', '-v, --version', 'output the version');

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
      'Scaffold a new SMOZ app from packaged templates (default: default)',
    )
    .option(
      '-t, --template <nameOrPath>',
      'Template name or directory path',
      'default',
    )
    .option(
      '-i, --install [pm]',
      'Install dependencies (optionally specify pm: npm|pnpm|yarn|bun)',
    )
    .option(
      '--no-install',
      'Skip dependency installation (overrides -y)',
      false,
    )
    .option('-y, --yes', 'Skip prompts (non-interactive)', false)
    .option('--dry-run', 'Show planned actions without writing', false)
    .action(
      async (opts: {
        template?: string;
        install?: string | boolean;
        noInstall?: boolean;
        yes?: boolean;
        dryRun?: boolean;
        conflict?: string;
      }) => {
        try {
          const cfg = readSmozConfig(root).cliDefaults?.init ?? {};
          // Resolve template: CLI > config > default
          const tpl =
            typeof opts.template === 'string'
              ? opts.template
              : typeof cfg.template === 'string'
                ? cfg.template
                : 'default';
          // Resolve install behavior: CLI > --no-install > config
          let install: string | boolean | undefined = opts.install;
          if (opts.noInstall === true) {
            install = false;
          } else if (install === undefined) {
            const d = cfg.install;
            install =
              d === 'auto'
                ? true
                : d === 'none'
                  ? false
                  : typeof d === 'string'
                    ? d
                    : undefined;
          }
          const conflict =
            typeof opts.conflict === 'string' ? opts.conflict : cfg.onConflict;
          const { created, skipped, examples, merged, installed } =
            await runInit(root, tpl, {
              // Include only when defined to satisfy exactOptionalPropertyTypes
              ...(install !== undefined ? { install } : {}),
              ...(typeof conflict === 'string' ? { conflict } : {}),
              yes: opts.yes === true,
              noInstall: opts.noInstall === true,
              dryRun: opts.dryRun === true,
            });
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
      'Scan app/functions/** and generate app/generated/register.*.ts (one-shot)',
    )
    .action(async () => {
      const { wrote } = await runRegister(root);
      console.log(
        wrote.length ? `Updated:\n - ${wrote.join('\n - ')}` : 'No changes.',
      );
    });

  program
    .command('openapi')
    .description('Generate app/generated/openapi.json (one-shot)')
    .action(async () => {
      try {
        await runOpenapi(root, { verbose: true });
      } catch (e) {
        console.error((e as Error).message);
        process.exitCode = 1;
      }
    });

  program
    .command('dev')
    .description(
      'Watch loop: keep registers/openapi fresh; optionally serve HTTP locally',
    )
    .option('-r, --register', 'Enable register step on change', true)
    .option('-R, --no-register', 'Disable register step on change')
    .option('-o, --openapi', 'Enable openapi step on change', true)
    .option('-O, --no-openapi', 'Disable openapi step on change')
    .option('-l, --local [mode]', 'Local server mode: inline|offline', 'inline')
    .option('-s, --stage <name>', 'Stage name (default inferred)')
    .option('-p, --port <n>', 'Port (0=random)', (v) => Number(v), 0)
    .option('-V, --verbose', 'Verbose logging', false)
    .action(
      async (opts: {
        register?: boolean;
        openapi?: boolean;
        local?: string | boolean;
        stage?: string;
        port?: number;
        verbose?: boolean;
      }) => {
        try {
          const cfg = readSmozConfig(root).cliDefaults?.dev ?? {};
          // Resolve local mode default from config if not provided
          const localResolved: false | 'inline' | 'offline' =
            typeof opts.local === 'string'
              ? (opts.local as 'inline' | 'offline')
              : opts.local === false
                ? false
                : (cfg.local ?? 'inline');
          await runDev(root, {
            register: opts.register !== false,
            openapi: opts.openapi !== false,
            local: localResolved,
            ...(typeof opts.stage === 'string' ? { stage: opts.stage } : {}),
            port: opts.port ?? 0,
            verbose: !!opts.verbose,
          });
        } catch (e) {
          console.error((e as Error).message);
          process.exitCode = 1;
        }
      },
    );
  // Default action (no subcommand): print version + signature block
  program.action(() => {
    printSignature();
  });
  program.parse(process.argv);
};

main();
