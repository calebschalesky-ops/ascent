/**
 * Side and vertical thrusters, the dodge dash and double-taps (mc-controls, R3). Pure, unit-tested.
 *
 * The space flight model already moves the ship along its nose (throttle, flight assist). These add a lateral
 * velocity in the ship's own frame: x to its right, y to its top. Thrusters push it toward the input at THRUST.accel;
 * let go and flight assist damps it away quickly (without assist it drifts), so the ship still feels like it did.
 * Units are world units and seconds; the cruiser is 0.371 units long (Voyage SHIP_LENGTH).
 */
export const THRUST = {
  /** Top speed on the side and vertical thrusters (units/s): about 16 ship lengths a second. */
  strafe: 6,
  /** How hard the thrusters push toward the wanted side speed (units/s²): full side speed in under half a second. */
  accel: 14,
  /** Flight assist's damping of side motion once the keys are let go (1/s): mostly gone in half a second. */
  assistDamp: 4,
  /** Without assist side motion only fades very slowly (1/s). */
  driftDamp: 0.15,
  /** Two presses of the same key within this many seconds are a double-tap. */
  doubleTap: 0.25,
} as const;

/**
 * The dodge dash (double-tap A or D): a sharp sideways impulse on top of the thrusters, paid from the capacitor,
 * then a cooldown. It decays with a quarter-second time constant, so it carries the ship about 3.4 units (nine
 * ship lengths) aside, six times a bolt's reach plus the cruiser's hit radius (0.55). First numbers, mc-controls's.
 */
export const DODGE_DASH = {
  impulse: 18, // units/s added across the ship
  decay: 4, // 1/s: how fast speed above the thrusters' top speed bleeds off
  cost: 15, // capacitor energy (the Mk I reactor holds 100)
  cooldown: 2.5, // seconds before the next dodge
} as const;

export interface Lateral { x: number; y: number }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** One axis of side motion: toward `want` (units/s) under thrust, or damped when there is no input. */
function axis(v: number, input: number, assist: boolean, dt: number): number {
  if (input !== 0) {
    const want = input * THRUST.strafe;
    // Above the thrusters' top speed in the same direction (a dodge): bleed off toward it.
    if (Math.abs(v) > THRUST.strafe && Math.sign(v) === Math.sign(want)) return want + (v - want) * Math.exp(-dt * DODGE_DASH.decay);
    return v + clamp(want - v, -THRUST.accel * dt, THRUST.accel * dt);
  }
  // No input: a dodge's extra speed bleeds off as fast as ever; the rest is flight assist's (or drift's).
  if (Math.abs(v) > THRUST.strafe) v = Math.sign(v) * THRUST.strafe + (v - Math.sign(v) * THRUST.strafe) * Math.exp(-dt * DODGE_DASH.decay);
  return v * Math.exp(-dt * (assist ? THRUST.assistDamp : THRUST.driftDamp));
}

/** One step of side motion. `input` is −1..1 on each axis (strafe right +x, thrust up +y). */
export function stepLateral(lat: Lateral, input: Lateral, assist: boolean, dt: number): Lateral {
  return { x: axis(lat.x, input.x, assist, dt), y: axis(lat.y, input.y, assist, dt) };
}

/** Full stop (X): side motion is killed as firmly as the engines brake. */
export const stopLateral = (lat: Lateral, dt: number): Lateral => ({ x: lat.x * Math.exp(-dt * 6), y: lat.y * Math.exp(-dt * 6) });

/** Double-tap detection: remembers each key's last press. Returns true when this press is the second of a pair. */
export function doubleTap(last: Map<string, number>, key: string, now: number): boolean {
  const before = last.get(key);
  if (before !== undefined && now - before <= THRUST.doubleTap) { last.delete(key); return true; }
  last.set(key, now);
  return false;
}

export interface DodgeState { readyAt: number; count: number }
export const newDodge = (): DodgeState => ({ readyAt: 0, count: 0 });

/**
 * Try a dodge at time `now` (seconds) to `side` (−1 left, +1 right) with `energy` in the capacitor. Returns the
 * energy it costs, or a reason it cannot go; on success `lat` gets the impulse and the cooldown starts.
 */
export function tryDodge(s: DodgeState, lat: Lateral, side: number, now: number, energy: number): { ok: true; cost: number } | { ok: false; why: 'cooldown' | 'energy' } {
  if (now < s.readyAt) return { ok: false, why: 'cooldown' };
  if (energy < DODGE_DASH.cost) return { ok: false, why: 'energy' };
  lat.x += Math.sign(side || 1) * DODGE_DASH.impulse;
  s.readyAt = now + DODGE_DASH.cooldown;
  s.count++;
  return { ok: true, cost: DODGE_DASH.cost };
}
