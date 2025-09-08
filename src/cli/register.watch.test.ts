/* REQUIREMENTS ADDRESSED (TEST)
- Validate register --watch debounce behavior and multi-event coalescing.
- Use a fake watcher and fake timers to simulate rapid file changes.
*/
import { describe, expect, it, vi } from 'vitest';

import type { Watcher, WatchFactory } from '@/src/cli/register.watch';
import { watchRegister } from '@/src/cli/register.watch';

class FakeWatcher implements Watcher {
  private handlers: Record<string, Array<() => void>> = {
    add: [],
    change: [],
    unlink: [],
  };
  on(event: 'add' | 'change' | 'unlink', cb: () => void): Watcher {
    const list = this.handlers[event] ?? (this.handlers[event] = []);
    list.push(cb);
    return this;
  }
  trigger(event: 'add' | 'change' | 'unlink') {
    const list = this.handlers[event] ?? [];
    for (const cb of list) cb();
  }
  close(): void {
    // no-op for fake
  }
}
describe('register.watch (debounce)', () => {
  it('coalesces rapid events and calls runOnce once per burst', async () => {
    vi.useFakeTimers();
    try {
      const fake = new FakeWatcher();
      const watchFactory: WatchFactory = () => fake;

      const runOnce = vi.fn(async () => {
        /* no-op */
      });
      const close = await watchRegister('/tmp/sandbox', runOnce, {
        debounceMs: 50,
        watchFactory,
      });
      // First burst (multiple events within debounce window)
      fake.trigger('add');
      fake.trigger('change');
      vi.advanceTimersByTime(40);
      fake.trigger('unlink');
      vi.advanceTimersByTime(49);
      expect(runOnce).toHaveBeenCalledTimes(0);
      vi.advanceTimersByTime(1);
      expect(runOnce).toHaveBeenCalledTimes(1);

      // Second burst (separate after debounce)
      fake.trigger('change');
      vi.advanceTimersByTime(50);
      expect(runOnce).toHaveBeenCalledTimes(2);

      close();
    } finally {
      vi.useRealTimers();
    }
  });
});
