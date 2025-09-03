import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildSafeDefaults } from '@/src/http/middleware/httpStackCustomization';
import { assertInvariants, getId } from '@/src/http/middleware/transformUtils';

describe('buildSafeDefaults', () => {
  it('produces phases satisfying invariants', () => {
    const phases = buildSafeDefaults({
      contentType: 'application/json',
      logger: console,
      opts: {},
      eventSchema: undefined,
      responseSchema: undefined,
    });
    expect(() => {
      assertInvariants(phases);
    }).not.toThrow();
  });

  it('includes zod-before/after when schemas are present', () => {
    const phases = buildSafeDefaults({
      contentType: 'application/json',
      logger: console,
      opts: {},
      eventSchema: z.object({}),
      responseSchema: z.object({}),
    });
    const beforeIds = phases.before.map(getId);
    const afterIds = phases.after.map(getId);
    expect(beforeIds).toContain('zod-before');
    expect(afterIds).toContain('zod-after');
  });
});
