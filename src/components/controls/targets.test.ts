import { describe, expect, it } from 'vitest';
import { TARGETS, activeLock, newLockSet, pickAlong, setActive, startLock, stepLocks, unlock } from './targets';
import type { LockInfo } from './targets';

const ok: LockInfo = { alive: true, inRange: true, jammed: false, time: 1.5 };

describe('selecting by click (E4)', () => {
  const ships = [{ id: 7, pos: [0, 0, -100] as [number, number, number], radius: 0.5 }];
  const bodies = [
    { id: 'moon', pos: [0, 0, -5000] as [number, number, number], size: 1000 },
    { id: 'earth', pos: [0, 0, -20000] as [number, number, number], size: 8000 },
  ];
  it('a ship near the click wins over the world behind it', () => {
    expect(pickAlong([0, 0, 0], [0.01, 0, -1], ships, bodies)).toEqual({ kind: 'ship', id: 7 });
  });
  it('off the ship, the nearest body on the ray', () => {
    expect(pickAlong([0, 0, 0], [0.1, 0, -1], ships, bodies)).toEqual({ kind: 'body', id: 'moon' });
    expect(pickAlong([0, 0, 0], [0.3, 0, -1], ships, bodies)).toEqual({ kind: 'body', id: 'earth' });
  });
  it('empty space picks nothing', () => {
    expect(pickAlong([0, 0, 0], [1, 0, 0], ships, bodies)).toBeNull();
  });
  it('a ship past the pick range is not picked', () => {
    expect(pickAlong([0, 0, 0], [0, 0, -1], ships, [], 50)).toBeNull();
  });
});

describe('locking (E6)', () => {
  it('holds at most three locks', () => {
    const s = newLockSet();
    expect(TARGETS.cap).toBe(3);
    expect([1, 2, 3, 4].map((id) => startLock(s, id))).toEqual(['ok', 'ok', 'ok', 'full']);
    expect(startLock(s, 2)).toBe('already');
  });
  it('a lock builds over the lock time, and the first one held becomes active', () => {
    const s = newLockSet();
    startLock(s, 1); startLock(s, 2);
    const times: Record<number, number> = { 1: 1.5, 2: 3 };
    for (let i = 0; i < 80; i++) stepLocks(s, 1 / 60, (id) => ({ ...ok, time: times[id] }));
    expect(s.locks.find((l) => l.id === 1)!.locked).toBe(false); // 1.33 s: not quite
    const r = stepLocks(s, 0.2, (id) => ({ ...ok, time: times[id] }));
    expect(r.locked).toEqual([1]);
    expect(s.active).toBe(1);
    for (let i = 0; i < 120; i++) stepLocks(s, 1 / 60, (id) => ({ ...ok, time: times[id] }));
    expect(s.locks.every((l) => l.locked)).toBe(true);
    expect(s.active).toBe(1); // a second lock does not take over
  });
  it('switching the active target: only to a held lock', () => {
    const s = newLockSet();
    startLock(s, 1); startLock(s, 2); startLock(s, 3);
    stepLocks(s, 2, () => ok);
    expect(setActive(s, 3)).toBe(true);
    expect(activeLock(s)!.id).toBe(3);
    startLock(newLockSet(), 9);
    const t = newLockSet(); startLock(t, 9);
    expect(setActive(t, 9)).toBe(false); // still building
  });
  it('losing the active target hands it to the next held lock', () => {
    const s = newLockSet();
    startLock(s, 1); startLock(s, 2);
    stepLocks(s, 2, () => ok);
    expect(s.active).toBe(1);
    const r = stepLocks(s, 1 / 60, (id) => ({ ...ok, alive: id !== 1 }));
    expect(r.lost).toEqual([1]);
    expect(s.active).toBe(2);
    unlock(s, 2);
    expect(s.active).toBeNull();
  });
  it('out of range: a building lock drains away, a held one breaks', () => {
    const s = newLockSet();
    startLock(s, 1);
    stepLocks(s, 0.75, () => ok); // half built
    for (let i = 0; i < 30; i++) stepLocks(s, 1 / 60, () => ({ ...ok, inRange: false }));
    expect(s.locks).toHaveLength(0);
    startLock(s, 2);
    stepLocks(s, 2, () => ok);
    stepLocks(s, 1 / 60, () => ({ ...ok, jammed: true }));
    expect(s.locks).toHaveLength(0);
  });
});
