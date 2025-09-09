/**
 * Inline HTTP dev server — minimal integration tests
 *
 * Covers:
 * - Route mounting + 200 JSON (GET /openapi)
 * - HEAD short-circuit (200 with Content-Type)
 * - 404 for unknown routes
 *
 * Notes:
 * - Spawns the inline server via tsx to mirror real dev usage.
 * - Expects app/generated/register.*.ts to exist (kept fresh by the CLI).
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const waitForListening = async (
  child: ChildProcessWithoutNullStreams,
  timeoutMs = 15000,
): Promise<number> => {
  return await new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timed out waiting for inline server to start'));
    }, timeoutMs);

    let buf = '';
    const onData = (chunk: Buffer) => {
      buf += chunk.toString('utf8');
      const m = buf.match(/listening on http:\/\/localhost:(\d+)/i);
      if (m) {
        clearTimeout(timer);
        child.stdout.off('data', onData);
        resolve(Number(m[1]));
      }
    };
    child.stdout.on('data', onData);

    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Inline server exited early (code ${String(code)})`));
    });
  });
};

const startInline = async (): Promise<{
  port: number;
  close: () => Promise<void>;
}> => {
  // Resolve project-local tsx CLI if present; fallback to PATH.
  const repoRoot = process.cwd();
  const tsxCli = path.resolve(
    repoRoot,
    'node_modules',
    'tsx',
    'dist',
    'cli.js',
  );
  const entry = path.resolve(
    repoRoot,
    'src',
    'cli',
    'local',
    'inline.server.ts',
  );

  const args: string[] = [];
  let cmd: string;
  let shell = false;
  if (tsxCli) {
    // Prefer Node + js entry to avoid .cmd issues on Windows
    cmd = process.execPath;
    args.push(tsxCli, entry);
  } else {
    cmd = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';
    args.push(entry);
    shell = true;
  }

  const child = spawn(cmd, args, {
    cwd: repoRoot,
    shell,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      // Use random free port; server prints the chosen port.
      SMOZ_PORT: '0',
      // Keep output visible for diagnostics if needed
      SMOZ_VERBOSE: '1',
      // Stage name for context; inline adapter only prints the route table.
      SMOZ_STAGE: 'dev',
    },
  }) as ChildProcessWithoutNullStreams;

  // Prefix errors to stderr for easier debugging
  child.stderr.on('data', (d) => {
    const t = d.toString('utf8');
    process.stderr.write(`[inline.test] ${t}`);
  });

  const port = await waitForListening(child);

  const close = async () => {
    await new Promise<void>((resolve) => {
      if (child.exitCode !== null) {
        resolve();
        return;
      }
      child.once('exit', () => {
        resolve();
      });
      child.kill('SIGTERM');
      // Safety timeout to avoid hanging in CI
      setTimeout(() => {
        resolve();
      }, 1500);
    });
  };

  return { port, close };
};

describe('inline server (integration)', () => {
  let port = 0;
  let shutdown: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const { port: p, close } = await startInline();
    port = p;
    shutdown = close;
  }, 20000);

  afterAll(async () => {
    if (shutdown) await shutdown();
  });

  it('GET /openapi returns 200 JSON with openapi 3.1.0', async () => {
    const res = await fetch(`http://localhost:${port}/openapi`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    expect(res.status).toBe(200);
    const ct = res.headers.get('content-type') ?? '';
    expect(ct.toLowerCase()).toContain('application/json');
    const body = (await res.json()) as { openapi?: string };
    expect(body.openapi).toBe('3.1.0');
  });

  it('HEAD /openapi returns 200 with Content-Type', async () => {
    const res = await fetch(`http://localhost:${port}/openapi`, {
      method: 'HEAD',
      headers: { Accept: 'application/json' },
    });
    expect(res.status).toBe(200);
    const ct = res.headers.get('content-type') ?? '';
    expect(ct.toLowerCase()).toContain('application/json');
  });

  it('GET /no-such returns 404 Not Found', async () => {
    const res = await fetch(`http://localhost:${port}/no-such`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    expect(res.status).toBe(404);
    const ct = res.headers.get('content-type') ?? '';
    expect(ct.toLowerCase()).toContain('application/json');
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('Not Found');
  });
});
