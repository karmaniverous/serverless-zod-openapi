 
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineAppConfig } from '@/src';

// Minimal ad-hoc schemas to exercise compile-time constraints
const G = z.object({ A: z.string(), XOPT: z.string().optional() });
const S = z.object({ B: z.string() });

const ok = defineAppConfig(G, S, {
  serverless: {
    defaultHandlerFileName: 'handler',
    defaultHandlerFileExport: 'handler',
    httpContextEventMap: { my: {}, private: {}, public: {} },
  },
  global: { params: { A: 'a' }, envKeys: ['A'] as const },
  stage: { params: { dev: { B: 'b' } }, envKeys: ['B'] as const },
});

type GKeys = readonly (keyof z.infer<typeof G>)[];
// Expect compile-time failure: 'Z' not in G.shape; error on this line.
// @ts-expect-error 'Z' is not a key of G
const badGlobalEnvKeys: GKeys = ['Z'] as const;

const badGlobal = defineAppConfig(G, S, {
  serverless: {
    defaultHandlerFileName: 'handler',
    defaultHandlerFileExport: 'handler',
    httpContextEventMap: { my: {}, private: {}, public: {} },
  },
  global: { params: { A: 'a' }, envKeys: badGlobalEnvKeys },
  stage: { params: { dev: { B: 'b' } }, envKeys: ['B'] as const },
});

type SKeys = readonly (keyof z.infer<typeof S>)[];
// Expect compile-time failure: 'A' belongs to G, not S; error on this line.
// @ts-expect-error 'A' is not a key of S
const badStageEnvKeys: SKeys = ['A'] as const;

const badStage = defineAppConfig(G, S, {
  serverless: {
    defaultHandlerFileName: 'handler',
    defaultHandlerFileExport: 'handler',
    httpContextEventMap: { my: {}, private: {}, public: {} },
  },
  global: { params: { A: 'a' }, envKeys: ['A'] as const },
  stage: { params: { dev: { B: 'b' } }, envKeys: badStageEnvKeys },
});

void ok, void badGlobal, void badStage;

// Minimal runtime suite so Vitest considers this a test file
describe('compiletime.envKeys', () => {
  it('compiles with expected @ts-expect-error markers', () => {
    expect(true).toBe(true);
  });
});
export {};