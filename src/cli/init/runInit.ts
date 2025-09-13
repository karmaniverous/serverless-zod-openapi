import { existsSync, promises as fs } from 'node:fs';
import { join, posix, resolve, sep } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';

import { copyDirWithConflicts } from './conflicts';
import { readJson, writeJson } from './fs';
import { detectPm, runInstall } from './install';
import { ensureToolkitDependency, mergeAdditive } from './manifest';
import { resolveTemplatesBase, toPosix } from './paths';
import { seedRegisterPlaceholders } from './seed';
import type { ConflictPolicy, InitOptions, InitResult } from './types';

const toPosixSep = (p: string): string => p.split(sep).join('/');

export const runInit = async (
  root: string,
  template = 'default',
  opts?: InitOptions,
): Promise<InitResult> => {
  const created: string[] = [];
  const skipped: string[] = [];
  const examples: string[] = [];
  const merged: string[] = [];

  const optAll = opts ?? {};
  const templatesBase = resolveTemplatesBase();

  // Resolve template source: named template or filesystem path
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

  // 1) Copy shared project boilerplate
  if (existsSync(projectBase)) {
    const rl =
      optAll.yes === true
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
    rl?.close();
  }

  // 2) Copy selected template
  {
    const rl =
      optAll.yes === true
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
    rl?.close();
  }

  // 2.5) Convert template 'gitignore' into a real '.gitignore'
  try {
    const giSrc = join(root, 'gitignore');
    const giDot = join(root, '.gitignore');
    if (existsSync(giSrc)) {
      if (!existsSync(giDot)) {
        await fs.rename(giSrc, giDot);
        created.push(posix.normalize(giDot));
      } else {
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
    // best-effort
  }

  // Seed app/generated/register.* placeholders
  {
    const res = await seedRegisterPlaceholders(root);
    created.push(...res.created);
    skipped.push(...res.skipped);
  }

  // 3) package.json presence (create when missing)
  const pkgPath = join(root, 'package.json');
  let pkg = await readJson<Record<string, unknown>>(pkgPath);
  if (!pkg) {
    const name = toPosixSep(root).split('/').pop() ?? 'smoz-app';
    pkg = {
      name,
      private: true,
      type: 'module',
      version: '0.0.0',
      scripts: {},
    };
    if (!optAll.dryRun) await writeJson(pkgPath, pkg);
    created.push(posix.normalize(pkgPath));
  }

  // 4) Merge manifest additively (prefer template's embedded package.json)
  const templatePkgPath = resolve(srcBase, 'package.json');
  const manifest = existsSync(templatePkgPath)
    ? await readJson<Record<string, unknown>>(templatePkgPath)
    : await readJson<Record<string, unknown>>(
        resolve(templatesBase, '.manifests', `package.${template}.json`),
      );
  let pkgChanged = false;
  if (manifest) {
    const added = mergeAdditive(pkg, manifest);
    if (added.length > 0) {
      pkgChanged = true;
      merged.push(...added);
    }
  }

  // 4.5) Ensure runtime dependency on @karmaniverous/smoz is present
  {
    const injected = await ensureToolkitDependency(pkg, templatesBase);
    if (injected) {
      merged.push(injected);
      pkgChanged = true;
    }
  }
  if (!optAll.dryRun && pkgChanged) await writeJson(pkgPath, pkg);

  // 5) Optional install
  let installed:
    | 'skipped'
    | 'ran (npm)'
    | 'ran (pnpm)'
    | 'ran (yarn)'
    | 'ran (bun)'
    | 'unknown-pm'
    | 'failed' = 'skipped';

  // Policy:
  // -y implies auto install unless --no-install
  const installOpt = optAll.install ?? false;
  const impliedAuto =
    optAll.yes === true && optAll.noInstall !== true && installOpt !== false;

  const hasInstallString =
    typeof installOpt === 'string' && installOpt.trim() !== '';
  const pm = hasInstallString
    ? installOpt
    : installOpt === true || impliedAuto
      ? detectPm(root)
      : undefined;

  installed = pm ? runInstall(root, pm) : installed;

  return { created, skipped, examples, merged, installed };
};
