// context/test.ts
import fs from 'fs';
import path from 'path';
import type { RunnerTask, SerializedConfig } from 'vitest';
import { VitestTestRunner } from 'vitest/runners';
import type { VitestRunner, VitestRunnerConfig } from 'vitest/suite';

import { pojofy } from '@/pojofy';

const dirPath = path.join(__dirname, 'out');
const filePath = path.join(dirPath, 'test.json');

class JsonResultsRunner extends VitestTestRunner implements VitestRunner {
  private tests: unknown[] = [];
  constructor(public config: SerializedConfig & VitestRunnerConfig) {
    super(config);
  }
  onAfterRunTask(test: RunnerTask) {
    if (test.result?.state === 'fail') this.tests.push(pojofy(test));
  }

  onAfterRunFiles() {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    const tests = fs.existsSync(filePath)
      ? (JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown[])
      : [];

    fs.writeFileSync(
      filePath,
      JSON.stringify([...tests, ...this.tests], null, 4),
      'utf8',
    );

    if (this.tests.length) process.exitCode = 1;
  }
}

export default JsonResultsRunner;
