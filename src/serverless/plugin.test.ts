import { describe, expect, it } from 'vitest';

import SmozRegisterPlugin from '@/src/serverless/plugin';

describe('serverless/plugin', () => {
  it('registers expected hooks', () => {
    const p = new SmozRegisterPlugin();
    const hooks = (p as { hooks?: Record<string, unknown> }).hooks ?? {};
    expect(typeof hooks['before:package:initialize']).toBe('function');
    expect(typeof hooks['before:deploy:function:initialize']).toBe('function');
    expect(typeof hooks['before:deploy:deploy']).toBe('function');
    // No side effects executed in this unit test; spawn is exercised indirectly by CLI.
  });
});
