import { describe, expect, it } from 'vitest';

import { pojofy } from '@/src/util/pojofy';

describe('pojofy', () => {
  it('drops circular refs, preserves Date (as ISO string), converts typed arrays, omits Map/Set', () => {
    const a: Record<string, unknown> = { x: 1 };
    const b: Record<string, unknown> = { a };
    a.self = a; // circular
    a.other = b;
    const dt = new Date('2020-01-01T00:00:00Z');
    const ta = new Uint8Array([1, 2, 3]);
    const mp = new Map([['k', 'v']]);
    const st = new Set([1, 2]);
    const input = {
      a,
      when: dt,
      buf: ta,
      map: mp,
      set: st,
    };
    const out = pojofy(input) as Record<string, unknown>;
    // circular reference dropped (replacer returns undefined on second visit)
    expect((out.a as Record<string, unknown>).self).toBeUndefined();
    // Date serializes to ISO string via toJSON
    expect(typeof out.when).toBe('string');
    expect(String(out.when)).toBe('2020-01-01T00:00:00.000Z');
    // Typed array becomes plain array
    expect(out.buf).toEqual([1, 2, 3]);
    // Map/Set dropped
    expect(out.map).toBeUndefined();
    expect(out.set).toBeUndefined();
  });
});
