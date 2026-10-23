/**
 * EVE selection and locking (thread eve-controls, E4-E6). Pure, unit-tested.
 *
 * Selecting: a click is a ray from the camera; the ship nearest the ray (within its size on screen, or a small cone)
 * wins, else the nearest body or station the ray passes through.
 *
 * Locking: up to TARGETS.cap ships at once, each building its own lock over the munition's lock time while it stays in
 * range. One of them is the active target: the weapons fire at it. Clicking a lock's icon makes it active.
 */
import type { V3 } from '../../lib/nav';
import { LOCK } from '../../lib/weapons';

export const TARGETS = {
  /** Locks held at once (EVE's own cap depends on skills; three to start, a first number). */
  cap: 3,
  /** A click within this angle of a ship's centre (radians, about 1.7°) picks it, if its size on screen is smaller. */
  cone: 0.03,
  /** A ship's pick tolerance is this many times its radius. */
  shipSlack: 1.5,
  /** Bodies and stations: at least this much angle (radians) round their centre picks them, however small. */
  bodyCone: 0.02,
} as const;

export type Picked = { kind: 'ship'; id: number } | { kind: 'body'; id: string };

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const angle = (a: V3, b: V3) => {
  const c = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / Math.max(1e-12, len(a) * len(b));
  return Math.acos(Math.max(-1, Math.min(1, c)));
};

/**
 * What a click along `dir` from `from` lands on. Ships first (they are small and in front of the worlds they fly
 * past); of the bodies the ray passes through, the nearest. `maxShip` is the farthest a ship can be picked from.
 */
export function pickAlong(
  from: V3, dir: V3,
  ships: { id: number; pos: V3; radius: number }[],
  bodies: { id: string; pos: V3; size: number }[],
  maxShip = Infinity,
): Picked | null {
  let best: number | null = null;
  let bestK = 1;
  for (const s of ships) {
    const to = sub(s.pos, from);
    const d = len(to);
    if (d < 1e-9 || d > maxShip) continue;
    const tol = Math.max(Math.atan2(s.radius * TARGETS.shipSlack, d), TARGETS.cone);
    const k = angle(to, dir) / tol;
    if (k < bestK) { bestK = k; best = s.id; }
  }
  if (best !== null) return { kind: 'ship', id: best };
  let body: string | null = null;
  let bodyD = Infinity;
  for (const b of bodies) {
    const to = sub(b.pos, from);
    const d = len(to);
    if (d < 1e-9) continue;
    const tol = Math.max(Math.asin(Math.min(1, b.size / d)), TARGETS.bodyCone);
    if (angle(to, dir) <= tol && d - b.size < bodyD) { bodyD = d - b.size; body = b.id; }
  }
  return body === null ? null : { kind: 'body', id: body };
}

export interface TLock { id: number; progress: number; locked: boolean }
export interface LockSet { locks: TLock[]; active: number | null }
export const newLockSet = (): LockSet => ({ locks: [], active: null });

/** Start locking ship `id`. 'full' at the cap; 'already' if it is locked or locking. */
export function startLock(s: LockSet, id: number): 'ok' | 'full' | 'already' {
  if (s.locks.some((l) => l.id === id)) return 'already';
  if (s.locks.length >= TARGETS.cap) return 'full';
  s.locks.push({ id, progress: 0, locked: false });
  return 'ok';
}

/** Let go of a lock. If it was the active target, the next held lock becomes active (or none). */
export function unlock(s: LockSet, id: number): void {
  s.locks = s.locks.filter((l) => l.id !== id);
  if (s.active === id) s.active = s.locks.find((l) => l.locked)?.id ?? null;
}

/** Make a held lock the active target. A lock still building cannot be (EVE: you cannot shoot what is not locked). */
export function setActive(s: LockSet, id: number): boolean {
  const l = s.locks.find((x) => x.id === id);
  if (!l || !l.locked) return false;
  s.active = id;
  return true;
}

export interface LockInfo { alive: boolean; inRange: boolean; jammed: boolean; time: number }

/**
 * One step of every lock. A lock builds over its `time` while the ship is alive, in range and not jammed; out of range
 * while building, it drains at LOCK.decay and is dropped at nothing. A held lock breaks outright when the ship dies,
 * leaves range or hides in chaff. The first lock to complete with no active target becomes active. Returns the ids
 * that locked this step and those that were lost.
 */
export function stepLocks(s: LockSet, dt: number, info: (id: number) => LockInfo): { locked: number[]; lost: number[] } {
  const locked: number[] = [];
  const lost: number[] = [];
  for (const l of [...s.locks]) {
    const i = info(l.id);
    const ok = i.alive && i.inRange && !i.jammed;
    if (l.locked) {
      if (!ok) { lost.push(l.id); unlock(s, l.id); }
      continue;
    }
    if (!i.alive) { lost.push(l.id); unlock(s, l.id); continue; }
    if (ok) {
      l.progress = Math.min(1, l.progress + dt / Math.max(1e-6, i.time));
      if (l.progress >= 1) { l.locked = true; locked.push(l.id); if (s.active === null) s.active = l.id; }
    } else {
      l.progress = Math.max(0, l.progress - dt * LOCK.decay);
      if (l.progress <= 0) { lost.push(l.id); unlock(s, l.id); }
    }
  }
  return { locked, lost };
}

/** The active target, if it is held. */
export const activeLock = (s: LockSet): TLock | null => s.locks.find((l) => l.id === s.active && l.locked) ?? null;
