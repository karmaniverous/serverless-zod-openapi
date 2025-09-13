import { existsSync, promises as fs } from 'node:fs';
import { dirname, posix, relative, resolve } from 'node:path';

import { walk, writeIfAbsent } from './fs';
import type { ConflictPolicy } from './types';

export type ReadlineLike = { question: (q: string) => Promise<string> };
export const askConflict = async (
  rl: ReadlineLike,
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
    `File exists: ${filePath}\n` +
    `Choose: [o]verwrite, [e]xample, [s]kip, ` +
    `[O]verwrite all, [E]xample all, [S]kip all: `;
  const ans = (await rl.question(q)).trim();
  if (/^o$/.test(ans)) return 'overwrite';
  if (/^e$/.test(ans)) return 'example';
  if (/^s$/.test(ans)) return 'skip';
  if (/^O$/.test(ans)) return 'all-overwrite';
  if (/^E$/.test(ans)) return 'all-example';
  if (/^S$/.test(ans)) return 'all-skip';
  return 'example';
};

export const copyDirWithConflicts = async (
  srcDir: string,
  dstRoot: string,
  created: string[],
  skipped: string[],
  examples: string[],
  opts: {
    conflict: ConflictPolicy;
    rl?: ReadlineLike;
    exclude?: (relPath: string) => boolean;
  },
): Promise<void> => {
  const files = await walk(srcDir);
  let sticky: 'overwrite' | 'example' | 'skip' | undefined;

  for (const abs of files) {
    const rel = relative(srcDir, abs);
    if (opts.exclude && opts.exclude(rel)) {
      // Skip dev-only or excluded files silently.
      continue;
    }
    const dest = resolve(dstRoot, rel);
    const data = await fs.readFile(abs, 'utf8');
    if (!existsSync(dest)) {
      const { created: c } = await writeIfAbsent(dest, data);
      if (c) created.push(posix.normalize(dest));
      else skipped.push(posix.normalize(dest));
      continue;
    }

    // Conflict flow
    let decision: 'overwrite' | 'example' | 'skip' =
      opts.conflict === 'ask' ? 'example' : opts.conflict;

    if (opts.conflict === 'ask' && opts.rl && !sticky) {
      const ans = await askConflict(opts.rl, posix.normalize(dest));
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
      await fs.mkdir(dirname(dest), { recursive: true });
      await fs.writeFile(dest, data, 'utf8');
      created.push(posix.normalize(dest));
    } else if (decision === 'example') {
      const ex = `${dest}.example`;
      const { created: c } = await writeIfAbsent(ex, data);
      if (c) examples.push(posix.normalize(ex));
      else skipped.push(posix.normalize(ex));
    } else {
      skipped.push(posix.normalize(dest));
    }
  }
};
