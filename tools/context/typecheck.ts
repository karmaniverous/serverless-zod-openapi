import { promises as fs } from 'fs';
import path from 'path';
import ts from 'typescript';

type Pos = { line: number; character: number };
type FlatDiagnostic = {
  filePath: string | null;
  start: Pos | null;
  length: number | null;
  category: 'error' | 'warning' | 'suggestion' | 'message';
  code: number;
  message: string;
  related?: Array<{
    filePath: string | null;
    start: Pos | null;
    length: number | null;
    message: string;
  }>;
};

const toCategory = (c: ts.DiagnosticCategory): FlatDiagnostic['category'] => {
  switch (c) {
    case ts.DiagnosticCategory.Error:
      return 'error';
    case ts.DiagnosticCategory.Warning:
      return 'warning';
    case ts.DiagnosticCategory.Suggestion:
      return 'suggestion';
    default:
      return 'message';
  }
};

const posOf = (
  file: ts.SourceFile | undefined,
  start: number | undefined,
): Pos | null => {
  if (!file || typeof start !== 'number') return null;
  const p = file.getLineAndCharacterOfPosition(start);
  return { line: p.line + 1, character: p.character + 1 };
};

const flattenMessage = (msg: string | ts.DiagnosticMessageChain): string => {
  if (typeof msg === 'string') return msg;
  const parts: string[] = [];
  const walk = (m: ts.DiagnosticMessageChain, depth: number): void => {
    const prefix = depth > 0 ? '  '.repeat(depth) + '- ' : '';
    parts.push(`${prefix}${m.messageText}`);
    if (m.next) m.next.forEach((n) => walk(n, depth + 1));
  };
  walk(msg, 0);
  return parts.join('\n');
};

const isTsFile = (p: string): boolean =>
  /\.(tsx?|cts|mts)$/i.test(p) && !/\.d\.ts$/i.test(p);

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.serverless',
  'dist',
  'build',
  'coverage',
  'openapi',
  'context/out',
]);

const defaultRoots = ['src', 'tools', 'test'];

const collectFiles = async (roots: string[]): Promise<string[]> => {
  const out: string[] = [];
  const q: string[] = [];

  for (const r of roots) {
    const abs = path.resolve(r);
    try {
      const st = await fs.stat(abs);
      if (st.isDirectory()) q.push(abs);
      else if (st.isFile() && isTsFile(abs)) out.push(abs);
    } catch {
      // ignore missing roots
    }
  }

  while (q.length) {
    const dir = q.pop()!;
    const base = path.basename(dir);
    if (IGNORED_DIRS.has(base)) continue;
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      const full = path.join(dir, name);
      try {
        const st = await fs.stat(full);
        if (st.isDirectory()) {
          if (!IGNORED_DIRS.has(name)) q.push(full);
        } else if (st.isFile() && isTsFile(full)) {
          out.push(full);
        }
      } catch {
        // ignore transient fs errors
      }
    }
  }

  // de-dupe while preserving order
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const f of out) {
    const norm = path.normalize(f);
    if (!seen.has(norm)) {
      seen.add(norm);
      uniq.push(norm);
    }
  }
  return uniq;
};

const main = async (): Promise<void> => {
  const projectTsconfig = 'tsconfig.json';
  const outDir = path.resolve('tools/context/out');
  const outJson = path.join(outDir, 'typecheck.json');

  await fs.mkdir(outDir, { recursive: true });

  // Load & parse your existing tsconfig.json
  const configPath = ts.findConfigFile(
    process.cwd(),
    ts.sys.fileExists,
    projectTsconfig,
  );
  if (!configPath) throw new Error(`Cannot find tsconfig: ${projectTsconfig}`);

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    // rethrow as plain error text
    const host: ts.FormatDiagnosticsHost = {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => ts.sys.newLine,
    };
    const text = ts.formatDiagnosticsWithColorAndContext(
      [configFile.error],
      host,
    );
    throw new Error(text);
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
  );

  // Start from the files TypeScript thinks are in the project…
  const rootNames = new Set<string>(
    parsed.fileNames.map((f) => path.normalize(f)),
  );

  // …then add *all* TS/TSX files we can find in src/, tools/, test/
  const extraFiles = await collectFiles(defaultRoots);
  for (const f of extraFiles) rootNames.add(f);

  // Build program and gather diagnostics
  const program = ts.createProgram({
    rootNames: Array.from(rootNames),
    options: parsed.options,
  });

  const diags = ts.getPreEmitDiagnostics(program);

  // Flatten diagnostics to JSON
  const flat: FlatDiagnostic[] = diags.map((d) => {
    const file = d.file;
    const startNum = typeof d.start === 'number' ? d.start : undefined;
    const lenNum = typeof d.length === 'number' ? d.length : undefined;
    const related =
      d.relatedInformation?.map((ri) => {
        const rf = ri.file;
        const rstart = typeof ri.start === 'number' ? ri.start : undefined;
        const rlen = typeof ri.length === 'number' ? ri.length : undefined;
        return {
          filePath: rf ? path.normalize(rf.fileName) : null,
          start: posOf(rf, rstart),
          length: typeof rlen === 'number' ? rlen : null,
          message:
            typeof ri.messageText === 'string'
              ? ri.messageText
              : flattenMessage(ri.messageText),
        };
      }) ?? undefined;

    return {
      filePath: file ? path.normalize(file.fileName) : null,
      start: posOf(file, startNum),
      length: typeof lenNum === 'number' ? lenNum : null,
      category: toCategory(d.category),
      code: d.code,
      message:
        typeof d.messageText === 'string'
          ? d.messageText
          : flattenMessage(d.messageText),
      related,
    };
  });

  const counts = flat.reduce(
    (acc, f) => {
      acc.total += 1;
      acc[f.category] += 1 as 0 | 1;
      return acc;
    },
    { total: 0, error: 0, warning: 0, suggestion: 0, message: 0 },
  );

  const payload = {
    meta: {
      tsVersion: ts.version,
      configPath: path.relative(process.cwd(), configPath),
      generatedAt: new Date().toISOString(),
    },
    filesChecked: program
      .getRootFileNames()
      .map((f) => path.relative(process.cwd(), f))
      .sort(),
    counts,
    diagnostics: flat,
  };

  await fs.writeFile(outJson, JSON.stringify(payload, null, 2), 'utf8');

  // Non-zero exit if there are *errors* (warnings etc. won't fail)
  if (counts.error > 0) {
    process.exitCode = 1;
  }
};

main().catch((err: unknown) => {
  const msg = err instanceof Error ? (err.stack ?? err.message) : String(err);
  // Ensure the error is visible in CI logs, but do not block JSON writing if it already happened.
  console.error(msg);
  process.exitCode = 1;
});
