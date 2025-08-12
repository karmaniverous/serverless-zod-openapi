import { Console } from 'node:console';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';

import { startVitest } from 'vitest/node';
import { VitestTestRunner } from 'vitest/runners';
import type {
  File,
  Suite,
  Test as VitestTest,
  VitestRunner,
  VitestRunnerConfig,
} from 'vitest/suite';

/**
 * Strip ANSI escape codes without adding deps.
 */
const stripAnsi = (input: string): string => {
  // eslint-disable-next-line no-control-regex
  const ansiRegex = new RegExp(
    '[\\u001B\\u009B][[\\]()#;?]*(?:' +
      '(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)?)?\\u0007' +
      '|' +
      '(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]' +
      ')',
    'g',
  );
  return input.replace(ansiRegex, '');
};

type TestStatus = 'passed' | 'failed' | 'skipped' | 'todo';

type TestCaseResult = {
  readonly title: string;
  status: TestStatus;
  duration?: number;
  errorStack?: string;
  stdout?: string;
  stderr?: string;
};

type SuiteResult = {
  readonly title: string;
  readonly suites: SuiteResult[];
  readonly tests: TestCaseResult[];
};

type FileResult = {
  readonly file: string;
  readonly suites: SuiteResult[];
  readonly tests: TestCaseResult[];
};

type TestSummary = {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  todoTests: number;
  totalFiles: number;
  failedFiles: number;
  passedFiles: number;
};

class JsonTestRunner extends VitestTestRunner implements VitestRunner {
  public readonly config: VitestRunnerConfig;
  private readonly results: FileResult[] = [];
  private currentFile?: FileResult;
  private readonly suiteStack: SuiteResult[] = [];
  private readonly taskMap = new Map<VitestTest, TestCaseResult>();
  private totalCount = 0;
  private failedCount = 0;
  private passedCount = 0;
  private skippedCount = 0;
  private todoCount = 0;
  private failedFilesCount = 0;
  private passedFilesCount = 0;

  // log capture state
  private originalConsole?: Console;
  private originalStdoutWrite?: (chunk: unknown, ...args: unknown[]) => boolean;
  private originalStderrWrite?: (chunk: unknown, ...args: unknown[]) => boolean;
  private stdoutBuffer: string[] = [];
  private stderrBuffer: string[] = [];

  constructor(config: VitestRunnerConfig) {
    super(config);
    this.config = config;
  }

  // ---- lifecycle ----
  public onCollected = (files: File[]): void => {
    for (const file of files) {
      const fileResult: FileResult = {
        file: file.filepath ?? 'unknown',
        suites: [],
        tests: [],
      };
      for (const task of file.tasks) {
        this.processTask(task, fileResult.suites, fileResult.tests);
      }
      this.results.push(fileResult);
    }
    // initial counts
    for (const fileRes of this.results) {
      this.countTests(fileRes.suites, fileRes.tests);
    }
  };

  public onBeforeRunFiles = (_files: File[]): void => {
    this.currentFile = undefined;
  };

  public onBeforeRunSuite = (suite: Suite): void => {
    if (!suite.suite) {
      // top-level file
      this.currentFile = this.results.find(
        (f) => f.file === suite.filepath,
      ) ?? {
        file: suite.filepath ?? 'unknown',
        suites: [],
        tests: [],
      };
      return;
    }
    // nested describe
    const parent = this.suiteStack.length
      ? this.suiteStack[this.suiteStack.length - 1]
      : this.currentFile;
    if (!parent) return;
    const match = parent.suites.find(
      (s) => s.title === (suite.name ?? '(suite)'),
    );
    if (match) this.suiteStack.push(match);
  };

  public onAfterRunSuite = (suite: Suite): void => {
    if (!suite.suite) {
      // file suite done
      const hasErrors = Boolean(suite.result?.errors?.length);
      if (hasErrors) this.failedFilesCount += 1;
      else this.passedFilesCount += 1;
      this.currentFile = undefined;
    } else {
      this.suiteStack.pop();
    }
  };

  public onBeforeRunTask = (test: VitestTest): void => {
    if (test.mode !== 'run') return; // skip/todo
    this.startLogCapture();
  };

  public onAfterRunTask = (test: VitestTest): void => {
    const testRes = this.taskMap.get(test);
    if (!testRes) return;
    if (test.mode === 'run') {
      const state = test.result?.state;
      if (state === 'fail') testRes.status = 'failed';
      else if (state === 'pass') testRes.status = 'passed';

      if (typeof test.result?.duration === 'number') {
        testRes.duration = test.result.duration;
      }

      if (testRes.status === 'failed' && Array.isArray(test.result?.errors)) {
        const stacks = test.result.errors.map((err) => {
          if (err instanceof Error)
            return stripAnsi(String(err.stack ?? err.message ?? 'Error'));
          return stripAnsi(String(err as unknown));
        });
        testRes.errorStack = stacks.join('\\n\\n');
      }

      const { stdout, stderr } = this.stopLogCapture();
      testRes.stdout = stdout;
      testRes.stderr = stderr;

      if (testRes.status === 'passed') this.passedCount += 1;
      if (testRes.status === 'failed') this.failedCount += 1;
    }
  };

  public onAfterRunFiles = (_files: File[]): void => {
    const summary: TestSummary = {
      totalTests: this.totalCount,
      passedTests: this.passedCount,
      failedTests: this.failedCount,
      skippedTests: this.skippedCount,
      todoTests: this.todoCount,
      totalFiles: this.results.length,
      failedFiles: this.failedFilesCount,
      passedFiles: this.passedFilesCount,
    };
    const success = summary.failedTests === 0;

    const here = dirname(fileURLToPath(import.meta.url));
    const outDir = join(here, 'out');
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const outputPath = join(outDir, 'test.json');
    const jsonOut = { success, summary, files: this.results };
    writeFileSync(outputPath, `${JSON.stringify(jsonOut, null, 2)}\n`, 'utf8');
    if (!success) process.exitCode = 1;
  };

  // ---- helpers ----
  private countTests = (
    suites: SuiteResult[],
    tests: TestCaseResult[],
  ): void => {
    for (const t of tests) {
      this.totalCount += 1;
      if (t.status === 'skipped') this.skippedCount += 1;
      if (t.status === 'todo') this.todoCount += 1;
    }
    for (const s of suites) {
      this.countTests(s.suites, s.tests);
    }
  };

  private processTask = (
    task: File | Suite | VitestTest,
    suitesArr: SuiteResult[],
    testsArr: TestCaseResult[],
  ): void => {
    if (task.type === 'suite') {
      const suiteRes: SuiteResult = {
        title: task.name ?? '(suite)',
        suites: [],
        tests: [],
      };
      suitesArr.push(suiteRes);
      for (const sub of task.tasks) {
        this.processTask(sub, suiteRes.suites, suiteRes.tests);
      }
      return;
    }
    if (task.type === 'test') {
      const t: TestCaseResult = {
        title: task.name ?? '(test)',
        status: 'passed',
      };
      if (task.mode === 'skip' || task.pending) t.status = 'skipped';
      else if (task.mode === 'todo') t.status = 'todo';
      testsArr.push(t);
      this.taskMap.set(task, t);
    }
  };

  private startLogCapture = (): void => {
    this.stdoutBuffer = [];
    this.stderrBuffer = [];

    const stdoutStream = new Writable({
      write: (chunk, _enc, cb): void => {
        this.stdoutBuffer.push(String(chunk));
        cb();
      },
    });
    const stderrStream = new Writable({
      write: (chunk, _enc, cb): void => {
        this.stderrBuffer.push(String(chunk));
        cb();
      },
    });

    this.originalConsole = globalThis.console;
    this.originalStdoutWrite = process.stdout.write.bind(process.stdout);
    this.originalStderrWrite = process.stderr.write.bind(process.stderr);

    globalThis.console = new Console({
      stdout: stdoutStream,
      stderr: stderrStream,
    });
    process.stdout.write = ((chunk: unknown, ...args: unknown[]) => {
      stdoutStream.write(
        typeof chunk === 'string'
          ? chunk
          : Buffer.isBuffer(chunk)
            ? chunk
            : String(chunk),
        ...(args as []),
      );
      return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: unknown, ...args: unknown[]) => {
      stderrStream.write(
        typeof chunk === 'string'
          ? chunk
          : Buffer.isBuffer(chunk)
            ? chunk
            : String(chunk),
        ...(args as []),
      );
      return true;
    }) as typeof process.stderr.write;
  };

  private stopLogCapture = (): { stdout: string; stderr: string } => {
    if (this.originalConsole) globalThis.console = this.originalConsole;
    if (this.originalStdoutWrite)
      process.stdout.write = this
        .originalStdoutWrite as typeof process.stdout.write;
    if (this.originalStderrWrite)
      process.stderr.write = this
        .originalStderrWrite as typeof process.stderr.write;

    const stdout = stripAnsi(this.stdoutBuffer.join(''));
    const stderr = stripAnsi(this.stderrBuffer.join(''));
    return { stdout, stderr };
  };
}

export default JsonTestRunner;

// If executed directly (`tsx context/test.ts`), start Vitest with this runner.
const isMain = (() => {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    const me = fileURLToPath(import.meta.url);
    return argv1 === me;
  } catch {
    return false;
  }
})();

if (isMain) {
  await (async (): Promise<void> => {
    try {
      await startVitest('test', [], {
        runner: fileURLToPath(import.meta.url),
        threads: false,
        reporters: [],
      });
    } catch (err: unknown) {
      process.exitCode = 1;
      const here = dirname(fileURLToPath(import.meta.url));
      const outDir = join(here, 'out');
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
      const outputPath = join(outDir, 'test.json');
      const errorOut = {
        success: false,
        error: 'vitest-node-runner-error',
        message: String(err),
      };
      writeFileSync(
        outputPath,
        `${JSON.stringify(errorOut, null, 2)}\n`,
        'utf8',
      );
    }
  })();
}

void main();
