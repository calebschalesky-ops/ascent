/**
 * The shakedown flight: a short tutorial done by doing, in the real game. Each step finishes when the flight shows
 * the player did it (a `FlightProbe` read from Voyage a few times a second). Pure, so the rules are tested without a
 * renderer. The tutorial is skippable and its place is saved (store.ts GameData.tutorial).
 */
import type { WeaponId } from '../weapons';
import type { Action, Binds } from '../../components/controls/bindings';
import { ACTIONS, keyLabel } from '../../components/controls/bindings';

/** What the tutorial can see of the flight, read a few times a second. */
export interface FlightProbe {
  throttle: number; // 0..1
  speed: number;
  boosting: boolean;
  yaw: number; // the ship's heading and pitch, radians
  pitch: number;
  weapon: WeaponId;
  weapons: WeaponId[]; // the engine weapons the fit carries
  laserShots: number;
  laserHits: number;
  missileShots: number;
  missileHits: number;
  aimHit: boolean; // the laser's lead says a bolt fired now would hit
  locked: boolean; // a missile lock is held
  nav: 'map' | 'computer' | 'route' | null;
  auto: boolean; // the autopilot is flying
  target: string | null;
  docked: string | null;
  hull: number;
  maxHull: number;
  drillLeft: number; // drill targets still flying
  drillAhead: boolean; // at least one is in front of the ship and within reach
  dronesOut: number; // the player's drones flying (all three racks)
}

export type StepId = 'throttle' | 'steer' | 'boost' | 'laser' | 'switch' | 'lock' | 'drones' | 'map' | 'autopilot' | 'dock' | 'repair' | 'undock';

export interface Step {
  id: StepId;
  title: string;
  /**
   * What to do, with a mouse and keyboard. Every key is a `{action}` token from bindings.ts, filled from the player's
   * own table by `howTo`, so the lesson cannot name a key the game no longer binds (it did: GAMEPLAY.md, correction 4).
   */
  keys: string;
  /** What to do on a touch screen. */
  touch: string;
}

const ALL: Step[] = [
  { id: 'throttle', title: 'Open the throttle', keys: 'Hold {forward} to throttle up ({back} down, or scroll). Watch the bar on the right fill.', touch: 'Drag the throttle bar on the right upward.' },
  { id: 'steer', title: 'Steer', keys: 'The mouse never turns the ship. Double-click anywhere in space and the ship turns that way and holds it (or turn by hand with the arrow keys). Left-drag swings the camera. Make a good turn.', touch: 'Put a thumb on the left of the screen and drag to steer.' },
  { id: 'boost', title: 'Boost', keys: 'Hold {boost} for a burst of speed, or double-tap {forward} and keep holding it.', touch: 'Hold the Boost button.' },
  { id: 'laser', title: 'Laser, with the lead', keys: 'Drill targets are ahead ({stop} stops the ship). Turn the nose with the arrow keys, or double-click just past a target, until the small cross sits on the diamond; when it turns green, press {slot1} (the laser in hand) to switch it on, and again to switch it off. Two hits.', touch: 'Drill targets are ahead. Steer the small cross onto the diamond; when it turns green, hold Fire. Two hits.' },
  { id: 'switch', title: 'Switch weapons', keys: 'Press {slot2}: the hotbar picks slot 2, your missile. ({slot1} goes back to the laser; {swap} swaps between the last two.)', touch: 'Tap the weapon button to change to your missile.' },
  { id: 'lock', title: 'Lock and launch a missile', keys: 'Click a drill target, then press {lock}: a lock icon appears at the top, fills and reads LOCKED. Then press {slot2} again: the missile flies at the locked target.', touch: 'Hold the reticle on a drill target until it reads LOCKED, then Fire.' },
  { id: 'drones', title: 'Your drones', keys: 'Slot {slot5} carries 16 drones. Press {slot5} to pick them, then {use} launches the swarm. {slot5} again changes their job (explosive, shield, laser-focus); {use} again calls them home.', touch: 'Tap slot 5 on the hotbar: your 16 drones. Tap it again to launch them, and again to call them home.' },
  { id: 'map', title: 'The map, the computer and the route', keys: 'Press {nav} for navigation, then open each tab along its top: Map, Computer and Route. {nav} or Esc closes it.', touch: 'Tap ◎ Nav, then open each tab: Map, Computer and Route. ✕ closes it.' },
  { id: 'autopilot', title: 'Autopilot home', keys: 'Your home berth is set as the target. Press {autopilot} to engage the autopilot.', touch: 'Your home berth is set as the target. Tap Auto.' },
  { id: 'dock', title: 'Dock', keys: 'The autopilot flies you into the berth. Steer and you take the controls: {autopilot} hands them back. In reach of a berth, {enter} docks (or right-click the station: Dock).', touch: 'The autopilot flies you into the berth. Steer and you take the controls: tap Auto to hand them back.' },
  { id: 'repair', title: 'Repair', keys: 'The drill scuffed your hull. Press "Repair the hull" on the station screen.', touch: 'The drill scuffed your hull. Tap "Repair the hull".' },
  { id: 'undock', title: 'Undock', keys: 'Press Undock (or Esc) to leave the berth.', touch: 'Tap Undock to leave the berth.' },
];

/** The `{action}` tokens in a lesson's text. */
export const tokensOf = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

/** A step's lesson as the player reads it: the touch text on a touch screen, else the keys from their own binds. */
export function howTo(step: Step, binds: Binds, touch = false): string {
  if (touch) return step.touch;
  return step.keys.replace(/\{(\w+)\}/g, (all, a: string) => ((ACTIONS as string[]).includes(a) ? keyLabel(binds[a as Action]) : all));
}

/**
 * The steps for a fit: without a missile there is nothing to switch to or lock for, so those two are left out. (The
 * ship screen keeps a gun in the first weapon slot, so the laser step is always there.)
 */
export function stepsFor(weapons: WeaponId[]): Step[] {
  const missile = weapons.includes('missile');
  const laser = weapons.includes('laser');
  return ALL.filter((s) => (s.id === 'switch' || s.id === 'lock' ? missile && laser : s.id === 'laser' ? laser : true));
}

/** What a step remembers between probes: the counters when it started, and what has been seen. */
export interface StepMemory {
  start: FlightProbe;
  turned: number;
  boostTime: number;
  navSeen: ('map' | 'computer' | 'route')[];
  firedLocked: boolean; // a missile left while a lock was held (seen in this probe or the one before)
  last: FlightProbe;
}

export const memoryAt = (p: FlightProbe): StepMemory => ({ start: p, turned: 0, boostTime: 0, navSeen: [], firedLocked: false, last: p });

const angleDiff = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/** Fold a new probe into the memory (`dt` seconds since the last). */
export function observe(m: StepMemory, p: FlightProbe, dt: number): StepMemory {
  const navSeen = p.nav && !m.navSeen.includes(p.nav) ? [...m.navSeen, p.nav] : m.navSeen;
  return {
    ...m,
    turned: m.turned + angleDiff(p.yaw, m.last.yaw) + Math.abs(p.pitch - m.last.pitch),
    boostTime: m.boostTime + (p.boosting && p.speed > 0 ? dt : 0),
    navSeen,
    firedLocked: m.firedLocked || (p.missileShots > m.last.missileShots && (p.locked || m.last.locked)),
    last: p,
  };
}

/** Whether step `id` is done, given what was seen since it began. */
export function stepDone(id: StepId, m: StepMemory): boolean {
  const p = m.last;
  switch (id) {
    case 'throttle': return p.throttle >= 0.3;
    case 'steer': return m.turned >= 0.9;
    case 'boost': return m.boostTime >= 0.6;
    case 'laser': return p.laserHits - m.start.laserHits >= 2;
    case 'switch': return p.weapon === 'missile';
    case 'lock': return m.firedLocked;
    case 'drones': return p.dronesOut > 0;
    case 'map': return m.navSeen.length >= 3;
    case 'autopilot': return p.auto || p.docked !== null;
    case 'dock': return p.docked !== null;
    case 'repair': return p.docked !== null && p.hull >= p.maxHull;
    case 'undock': return p.docked === null;
  }
}

/** The hull the drill leaves: the repair step needs something to repair. */
export const DRILL_HULL = 72;

/** The steps that want drill targets in front of the ship. */
export const DRILL_STEPS: StepId[] = ['laser', 'switch', 'lock'];

/** Saved place in the tutorial. `step` is an id, so a change to the list never lands a save on the wrong step. */
export interface TutorialState { step: StepId | null; done: boolean; skipped: boolean }

export const newTutorial = (): TutorialState => ({ step: 'throttle', done: false, skipped: false });

const IDS = ALL.map((s) => s.id);
export function migrateTutorial(raw: unknown): TutorialState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const done = r.done === true;
  const step = IDS.includes(r.step as StepId) ? (r.step as StepId) : null;
  return { step: done ? null : step ?? 'throttle', done, skipped: r.skipped === true };
}

/** The step after `id` in `steps`, or null at the end. A step no longer in the list restarts from its neighbour. */
export function nextStep(steps: Step[], id: StepId): StepId | null {
  const i = steps.findIndex((s) => s.id === id);
  if (i < 0) {
    const all = IDS.indexOf(id);
    return steps.find((s) => IDS.indexOf(s.id) > all)?.id ?? null;
  }
  return steps[i + 1]?.id ?? null;
}

export function prevStep(steps: Step[], id: StepId): StepId | null {
  const i = steps.findIndex((s) => s.id === id);
  return i > 0 ? steps[i - 1].id : null;
}
