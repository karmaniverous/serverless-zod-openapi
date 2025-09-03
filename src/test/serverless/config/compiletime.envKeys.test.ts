 
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

// Expect compile-time failure: 'Z' not in G.shape
// @ts-expect-error unknown global env key
const badGlobal = defineAppConfig(G, S, {
  serverless: {
    defaultHandlerFileName: 'handler',
    defaultHandlerFileExport: 'handler',
    httpContextEventMap: { my: {}, private: {}, public: {} },
  },
  global: { params: { A: 'a' }, envKeys: ['Z'] as const },
  stage: { params: { dev: { B: 'b' } }, envKeys: ['B'] as const },
});

// Expect compile-time failure: 'A' belongs to G, not S
// @ts-expect-error unknown stage env key
const badStage = defineAppConfig(G, S, {
  serverless: {
    defaultHandlerFileName: 'handler',
    defaultHandlerFileExport: 'handler',
    httpContextEventMap: { my: {}, private: {}, public: {} },
  },
  global: { params: { A: 'a' }, envKeys: ['A'] as const },
  stage: { params: { dev: { B: 'b' } }, envKeys: ['A'] as const },
});

void ok;
void badGlobal;
void badStage;
export {};
