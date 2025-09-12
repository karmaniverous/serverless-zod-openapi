/**
 * smoz init
 *
 * Scaffolds a new project from packaged templates.
 * - Copies ./templates/<template>/ into the target root (default: default)
 * - Seeds app/generated/register.*.ts (empty modules) if missing * - Idempotent: copy-if-absent; if a file exists, writes <name>.example alongside
 * - Additive merge of template manifest (deps/devDeps/scripts) into package.json
 * - Optional dependency installation via --install[=<pm>]
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

import { packageDirectorySync } from 'package-directory';
const toPosix = (p: string): string => p.split(sep).join('/');

const writeIfAbsent = async (
  outFile: string,
  content: string,
): Promise<{ created: boolean }> => {
  if (existsSync(outFile)) return { created: false };
  await fs.mkdir(dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, content, 'utf8');
  return { created: true };
};

type ConflictPolicy = 'overwrite' | 'example' | 'skip' | 'ask';

const askConflict = async (
  rl: ReturnType<typeof createInterface>,
  filePath: string,
): Promise<
  | 'overwrite'
  | 'example'
  | 'skip'
  | 'all-overwrite'
  | 'all-example'
  | 'all-skip'
> => {
  const q =
    `File exists: ${toPosix(filePath)}\n` +
    `Choose: [o]verwrite, [e]xample, [s]kip, [O]verwrite all, [E]xample all, [S]kip all: `;
  // Single key selection for simplicity

  const ans = (await rl.question(q)).trim();
  if (/^o$/.test(ans)) return 'overwrite';
  if (/^e$/.test(ans)) return 'example';
  if (/^s$/.test(ans)) return 'skip';
  if (/^O$/.test(ans)) return 'all-overwrite';
  if (/^E$/.test(ans)) return 'all-example';
  if (/^S$/.test(ans)) return 'all-skip';
  return 'example';
};
const walk = async (dir: string, out: string[] = []): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      await walk(p, out);
    } else if (ent.isFile()) {
      out.push(p);
    }
  }
  return out;
};

const resolveTemplatesBase = (): string => {
  // Resolve the templates folder from the CLI package install root,
  // not the caller’s project root. This makes --template <name> work
  // consistently whether smoz is run from a consuming app or this repo.
  // Anchor discovery to this module’s directory.
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgRoot = packageDirectorySync({ cwd: here }) ?? process.cwd(); // conservative fallback
  return resolve(pkgRoot, 'templates');
};
const readJson = async <T = unknown>(file: string): Promise<T | undefined> => {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data) as T;
  } catch {
    return undefined;
  }
};
const writeJson = async (file: string, obj: unknown): Promise<void> => {
  await fs.mkdir(dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(obj, null, 2), 'utf8');
};
const detectPm = (
  root: string,
): 'pnpm' | 'yarn' | 'npm' | 'bun' | undefined => {
  if (existsSync(join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(root, 'package-lock.json'))) return 'npm';
  if (existsSync(join(root, 'bun.lockb'))) return 'bun';
  const ua = process.env.npm_config_user_agent ?? '';
  if (ua.includes('pnpm')) return 'pnpm';
  if (ua.includes('yarn')) return 'yarn';
  if (ua.includes('bun')) return 'bun';
  if (ua.includes('npm')) return 'npm';
  return undefined;
};

const runInstall = (
  root: string,
  pm?: string,
):
  | 'ran (npm)'
  | 'ran (pnpm)'
  | 'ran (yarn)'
  | 'ran (bun)'
  | 'skipped'
  | 'unknown-pm'
  | 'failed' => {
  if (!pm) return 'skipped';
  const known = pm === 'pnpm' || pm === 'yarn' || pm === 'bun' || pm === 'npm';
  if (!known) return 'unknown-pm';

  // Spawn with explicit args; avoid tuple inference that widens types.
  const res = spawnSync(pm, ['install'], {
    stdio: 'inherit',
    cwd: root,
    shell: true,
  });
  if (res.status === 0) {
    const tag: 'ran (pnpm)' | 'ran (yarn)' | 'ran (bun)' | 'ran (npm)' =
      pm === 'pnpm'
        ? 'ran (pnpm)'
        : pm === 'yarn'
          ? 'ran (yarn)'
          : pm === 'bun'
            ? 'ran (bun)'
            : 'ran (npm)';
    return tag;
  }
  return 'failed';
};

const mergeAdditive = (
  target: Record<string, unknown>,
  source: Record<string, unknown>,
) => {
  const merged: string[] = [];
  const mergeKey = (
    key: 'dependencies' | 'devDependencies' | 'peerDependencies',
  ) => {
    // Allow possibly-undefined shapes to satisfy lint (no-unnecessary-condition).
    const src = (source[key] as Record<string, string> | undefined) ?? {};
    const dst = (target[key] as Record<string, string> | undefined) ?? {};
    const out = { ...dst };
    let changed = false;
    for (const [k, v] of Object.entries(src)) {
      if (!(k in dst)) {
        out[k] = v;
        merged.push(`${key}:${k}@${v}`);
        changed = true;
      }
    }
    if (changed) {
      (target[key] as Record<string, string>) = out;
    }
  };
  mergeKey('dependencies');
  mergeKey('devDependencies');
  mergeKey('peerDependencies');
  const srcScripts =
    (source.scripts as Record<string, string> | undefined) ?? {};
  const dstScripts =
    (target.scripts as Record<string, string> | undefined) ?? {};
  const scriptsOut = { ...dstScripts };
  for (const [name, script] of Object.entries(srcScripts)) {
    if (!(name in dstScripts)) {
      scriptsOut[name] = script;
      merged.push(`scripts:${name}`);
    } else if (dstScripts[name] !== script) {
      const alias = `${name}:smoz`;
      if (!(alias in dstScripts)) {
        scriptsOut[alias] = script;
        merged.push(`scripts:${alias}`);
      }
    }
  }
  (target.scripts as Record<string, string>) = scriptsOut;
  return merged;
};

const copyDirWithConflicts = async (
  srcDir: string,
  dstRoot: string,
  created: string[],
  skipped: string[],
  examples: string[],
  opts: {
    conflict: ConflictPolicy;
    rl?: ReturnType<typeof createInterface>;
  },
) => {
  const files = await walk(srcDir);
  let sticky: 'overwrite' | 'example' | 'skip' | undefined;
  for (const abs of files) {
    const rel = relative(srcDir, abs);
    const dest = resolve(dstRoot, rel);
    const data = await fs.readFile(abs, 'utf8');
    if (!existsSync(dest)) {
      const { created: c } = await writeIfAbsent(dest, data);
      if (c) created.push(posix.normalize(dest));
      else skipped.push(posix.normalize(dest));
      continue;
    }
    // Conflict
    let decision: 'overwrite' | 'example' | 'skip' =
      opts.conflict === 'ask' ? 'example' : opts.conflict;
    if (opts.conflict === 'ask' && opts.rl && !sticky) {
      const ans = await askConflict(opts.rl, dest);
      if (ans === 'all-overwrite') {
        sticky = 'overwrite';
      } else if (ans === 'all-example') {
        sticky = 'example';
      } else if (ans === 'all-skip') {
        sticky = 'skip';
      } else {
        decision = ans;
      }
    }
    if (sticky) decision = sticky;
    if (decision === 'overwrite') {
      await fs.writeFile(dest, data, 'utf8');
      created.push(posix.normalize(dest));
    } else if (decision === 'example') {
      const ex = `${dest}.example`;
      await writeIfAbsent(ex, data);
      examples.push(posix.normalize(ex));
    } else {
      skipped.push(posix.normalize(dest));
    }
  }
};

export const runInit = async (
  root: string,
  template = 'default',
  opts?: {
    install?: string | boolean;
    yes?: boolean;
    noInstall?: boolean;
    conflict?: string;
    dryRun?: boolean;
  },
): Promise<{
  created: string[];
  skipped: string[];
  examples: string[];
  merged: string[];
  installed: string;
}> => {
  const created: string[] = [];
  const skipped: string[] = [];
  const examples: string[] = [];
  const merged: string[] = [];

  const optAll = opts ?? {};
  const templatesBase = resolveTemplatesBase();
  // Resolve template source: named template (default/minimal/full) or filesystem path
  const templateIsPath =
    existsSync(template) && (await fs.stat(template)).isDirectory();
  const srcBase = templateIsPath
    ? resolve(template)
    : resolve(templatesBase, template);
  const projectBase = resolve(templatesBase, 'project');
  if (!existsSync(srcBase)) {
    throw new Error(
      `Template "${template}" not found (path or name). Tried: ${toPosix(srcBase)}.`,
    );
  }

  // 1) Copy shared boilerplate (project) first (idempotent)
  if (existsSync(projectBase)) {
    const rl = optAll.yes
      ? undefined
      : createInterface({ input, output, terminal: true });
    let policy: ConflictPolicy;
    const c = optAll.conflict;
    if (c === 'overwrite' || c === 'example' || c === 'skip' || c === 'ask')
      policy = c;
    else policy = optAll.yes ? 'example' : 'ask';
    const copyOpts = rl
      ? ({ conflict: policy, rl } as const)
      : ({ conflict: policy } as const);
    await copyDirWithConflicts(
      projectBase,
      root,
      created,
      skipped,
      examples,
      copyOpts,
    );
    if (rl) rl.close();
  }
  // 2) Copy selected template
  {
    const rl = optAll.yes
      ? undefined
      : createInterface({ input, output, terminal: true });
    let policy: ConflictPolicy;
    const c = optAll.conflict;
    if (c === 'overwrite' || c === 'example' || c === 'skip' || c === 'ask')
      policy = c;
    else policy = optAll.yes ? 'example' : 'ask';
    const copyOpts = rl
      ? ({ conflict: policy, rl } as const)
      : ({ conflict: policy } as const);
    await copyDirWithConflicts(
      srcBase,
      root,
      created,
      skipped,
      examples,
      copyOpts,
    );
    if (rl) rl.close();
  }

  // 2.5) Convert template 'gitignore' into real '.gitignore'
  // NPM often excludes '.gitignore' from published packages; shipping 'gitignore'
  // and converting here ensures downstream projects get a proper .gitignore.
  try {
    const giSrc = join(root, 'gitignore');
    const giDot = join(root, '.gitignore');
    if (existsSync(giSrc)) {
      if (!existsSync(giDot)) {
        await fs.rename(giSrc, giDot);
        created.push(posix.normalize(giDot));
      } else {
        // Both exist: preserve the template as an example (if not already present),
        // then remove the extra 'gitignore' to avoid clutter.
        const example = join(root, 'gitignore.example');
        if (!existsSync(example)) {
          const data = await fs.readFile(giSrc, 'utf8');
          await fs.writeFile(example, data, 'utf8');
          examples.push(posix.normalize(example));
        }
        await fs.rm(giSrc, { force: true });
      }
    }
  } catch {
    // best-effort; ignore conversion errors
  }

  // Seed app/generated/register.*.ts (empty modules) if missing
  const genDir = resolve(root, 'app', 'generated');
  const seeds: Array<{ path: string; content: string }> = [
    {
      path: join(genDir, 'register.functions.ts'),
      content: `/* AUTO-GENERATED placeholder; will be rewritten by \`smoz register\` */\nexport {};\n`,
    },
    {
      path: join(genDir, 'register.openapi.ts'),
      content: `/* AUTO-GENERATED placeholder; will be rewritten by \`smoz register\` */\nexport {};\n`,
    },
    {
      path: join(genDir, 'register.serverless.ts'),
      content: `/* AUTO-GENERATED placeholder; will be rewritten by \`smoz register\` */\nexport {};\n`,
    },
  ];
  for (const s of seeds) {
    const { created: c } = await writeIfAbsent(s.path, s.content);
    if (c) created.push(posix.normalize(s.path));
    else skipped.push(posix.normalize(s.path));
  }

  // 3) package.json presence (create when missing)
  const pkgPath = join(root, 'package.json');
  let pkg = await readJson<Record<string, unknown>>(pkgPath);
  if (!pkg) {
    const name = toPosix(root).split('/').pop() ?? 'smoz-app';
    pkg = {
      name,
      private: true,
      type: 'module',
      version: '0.0.0',
      scripts: {},
    };
    const dryRunCreate = Boolean(optAll.dryRun);
    if (!dryRunCreate) await writeJson(pkgPath, pkg);
    created.push(posix.normalize(pkgPath));
  } // 4) Merge manifest (deps/devDeps/scripts) additively
  // Prefer a real package.json in the template; fallback to legacy manifests if absent.
  const templatePkgPath = resolve(srcBase, 'package.json');
  const manifest = existsSync(templatePkgPath)
    ? await readJson<Record<string, unknown>>(templatePkgPath)
    : await readJson<Record<string, unknown>>(
        resolve(templatesBase, '.manifests', `package.${template}.json`),
      );
  if (manifest) {
    const before = JSON.stringify(pkg);
    const added = mergeAdditive(pkg, manifest);
    merged.push(...added);
    const dryRun = Boolean(optAll.dryRun);
    if (!dryRun && before !== JSON.stringify(pkg)) {
      await writeJson(pkgPath, pkg);
    }
  }

  // 5) Optional install
  let installed:
    | 'skipped'
    | 'ran (npm)'
    | 'ran (pnpm)'
    | 'ran (yarn)'
    | 'ran (bun)'
    | 'unknown-pm'
    | 'failed' = 'skipped';
  // Install policy:
  // -y implies auto install unless --no-install
  const installOpt = optAll.install ?? false;
  const impliedAuto =
    optAll.yes === true && optAll.noInstall !== true && installOpt !== false;
  // Derive package manager to use (explicit string or detected when true),
  // then set installed based on presence of a PM.
  const hasInstallString =
    typeof installOpt === 'string' && installOpt.trim() !== '';
  const pm = hasInstallString
    ? installOpt
    : installOpt === true || impliedAuto
      ? detectPm(root)
      : undefined;
  installed = pm ? runInstall(root, pm) : installed;
  return {
    created,
    skipped,
    examples,
    merged,
    installed,
  };
};
