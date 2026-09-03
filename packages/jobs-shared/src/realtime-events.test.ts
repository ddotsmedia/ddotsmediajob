import { describe, it, expect } from 'vitest';
import { ADMIN_CHANNEL, ADMIN_EVENTS } from './realtime-events';

// Publisher and subscriber import these same values, so agreement is a
// compile-time property. These tests pin the wire format itself: renaming a
// channel or event silently breaks every already-open admin tab.
describe('admin realtime contract', () => {
  it('pins the channel name', () => {
    expect(ADMIN_CHANNEL).toBe('admin');
  });

  it('pins the event names the routers publish', () => {
    expect([...ADMIN_EVENTS]).toEqual(['job-pending', 'job-changed', 'application-received']);
  });

  it('uses names that are safe as Pusher channel/event identifiers', () => {
    // Pusher rejects channel names outside [A-Za-z0-9_\-=@,.;]
    expect(ADMIN_CHANNEL).toMatch(/^[A-Za-z0-9_\-=@,.;]+$/);
    for (const e of ADMIN_EVENTS) expect(e, e).toMatch(/^[a-z0-9-]+$/);
  });

  it('does not use a reserved Pusher prefix', () => {
    // private- and presence- channels require auth we do not implement here.
    expect(ADMIN_CHANNEL.startsWith('private-')).toBe(false);
    expect(ADMIN_CHANNEL.startsWith('presence-')).toBe(false);
  });
});
