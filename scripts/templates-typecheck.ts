/**
 * templates:typecheck
 * - Discover templates/*/tsconfig.json and run "tsc -p --noEmit" for each.
 * - Fail fast with a readable template name on error.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const templatesDir = path.join(repoRoot, 'templates');

const isDir = (p: string) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

const findTemplateConfigs = (): Array<{ name: string; tsconfig: string }> => {
  if (!existsSync(templatesDir)) return [];
  const entries = readdirSync(templatesDir);
  const out: Array<{ name: string; tsconfig: string }> = [];
  for (const name of entries) {
    // skip project and .check — only real templates should be listed
    if (name === 'project' || name === '.check' || name.startsWith('.')) continue;
    const dir = path.join(templatesDir, name);
    if (!isDir(dir)) continue;
    const tsconfig = path.join(dir, 'tsconfig.json');
    if (existsSync(tsconfig)) out.push({ name, tsconfig });
  }
  return out;
};

const run = () => {
  const targets = findTemplateConfigs();
  if (targets.length === 0) {
    console.log('No template tsconfig.json files found under templates/*.');
    return;
  }
  for (const t of targets) {
    console.log(`Typechecking template: ${t.name}`);
    const res = spawnSync(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['tsc', '-p', t.tsconfig, '--noEmit'],
      { stdio: 'inherit', cwd: repoRoot, shell: false },
    );
    if (res.status !== 0) {
      console.error(`Typecheck failed for template: ${t.name}`);
      process.exit(res.status ?? 1);
    }
  }
  console.log('All templates typecheck OK.');
};

run();
