/**
 * smoz init
 *
 * Scaffolds a new project from packaged templates.
 * - Copies ./templates/project/ into the target root (shared boilerplate)
 * - Copies ./templates/<template>/ into the target root (default: minimal)
 * - Seeds app/generated/register.*.ts (empty modules) if missing
 * - Idempotent: does not overwrite existing files
 */
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';

import { packageDirectorySync } from 'package-directory';

const toPosix = (p: string): string => p.split(sep).join('/');

const writeIfAbsent = async (outFile: string, content: string): Promise<{
  created: boolean;
}> => {
  if (existsSync(outFile)) return { created: false };
  await fs.mkdir(dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, content, 'utf8');
  return { created: true };
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
  // Resolve the package root (works both in dev and when installed)
  const pkgRoot = packageDirectorySync() ?? process.cwd();
  return resolve(pkgRoot, 'templates');
};

const copyDirIdempotent = async (
  srcDir: string,
  dstRoot: string,
  created: string[],
  skipped: string[],
) => {
  const files = await walk(srcDir);
  for (const abs of files) {
    const rel = relative(srcDir, abs);
    const dest = resolve(dstRoot, rel);
    const data = await fs.readFile(abs, 'utf8');
    const { created: c } = await writeIfAbsent(dest, data);
    if (c) created.push(posix.normalize(dest));
    else skipped.push(posix.normalize(dest));
  }
};

export const runInit = async (
  root: string,
  template = 'minimal',): Promise<{ created: string[]; skipped: string[] }> => {
  const created: string[] = [];
  const skipped: string[] = [];

  const templatesBase = resolveTemplatesBase();
  const srcBase = resolve(templatesBase, template);
  const projectBase = resolve(templatesBase, 'project');
  if (!existsSync(srcBase)) {
    throw new Error(
      `Template "${template}" not found under ${toPosix(templatesBase)}.`,
    );
  }

  // 1) Copy shared boilerplate (project) first (idempotent)
  if (existsSync(projectBase)) {
    await copyDirIdempotent(projectBase, root, created, skipped);
  }
  // 2) Copy selected template
  await copyDirIdempotent(srcBase, root, created, skipped);

  // Seed app/generated/register.*.ts (empty modules) if missing
  const genDir = resolve(root, 'app', 'generated');  const seeds: Array<{ path: string; content: string }> = [
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

  return { created, skipped };
};
