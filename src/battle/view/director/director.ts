/**
 * The director (PKG-11, VISION §7a "You see the whole battle"): the game films its own battle. Wide shots that show the
 * shape of it, then closer on what matters (a boarding run, a breach, a capture, a flagship turning, a line breaking, a
 * ship breaking or wrecked, a shield side opening), then wide again. The player takes the camera at any moment and it
 * gives way on that frame; after he leaves it alone for `DIRECTOR.handBack` seconds the director takes it back with a
 * slow move. While he holds it, a big moment elsewhere opens a picture-in-picture inset instead of moving his camera.
 *
 * Plain maths, no three.js and no DOM, so it runs under vitest. It READS the battle (the view frame and the sim's log)
 * and writes only the camera rig: it never calls the sim, and the battle's hash is the same with it on or off
 * (BRIDGE-DESIGN §12b rule 1; director.test.ts). Off when the `director` flag is off.
 */
import { flagOn } from '../../../flags';
import type { LogEvent } from '../../sim/types';
import type { CameraMode, CameraRig } from '../camera';
import { aimRig, eyeOf } from '../camera';
import type { BattleFrame, ShipCls, ShipView, V3 } from '../model';
import { underWay } from '../model';
import type { ShotKind, Transition } from './numbers';
import { BEATS, DIRECTOR } from './numbers';

export type { ShotKind, Transition } from './numbers';

/** One entry of the shot log: when, what kind, on whom, and why the director cut to it. */
export interface Shot { t: number; kind: ShotKind; subject: string | null; group?: string[]; reason: string; transition: Transition; prio: number }
/** Something in the battle worth filming. */
export interface Beat { t: number; kind: string; ship: string; group?: string[]; reason: string; prio: number; shot: ShotKind; big: boolean }
export interface Pip { t: number; until: number; kind: string; subject: string; group?: string[]; reason: string; prio: number }
export interface CamGoal { target: V3; dist: number; yaw: number; pitch: number }
/** The sim's log, read by global index across its cap (as simFeed.ts drains it). */
export interface LogSource { log: readonly LogEvent[]; logDropped: number }

export interface DirectorOptions {
  /** Ship length in battle units by class (scene.ts LOOK.length): sets how close a close shot stands. */
  lengths: Record<ShipCls, number>;
  /** Is this ship already on the player's screen? A big moment he can already see opens no inset. */
  visible?: (ship: ShipView) => boolean;
  /** PKG-15: the main camera's vertical field of view (degrees) and aspect, so a shot can hold its whole subject in the
   * narrower of the two angles (a phone held upright is narrow). Absent: `DIRECTOR.lens`. */
  lens?: () => { fov: number; aspect: number };
}

export interface Director {
  /** One fixed step: read the battle, decide the shot, move the rig (director mode only). */
  step(frame: BattleFrame, src: LogSource | null, rig: CameraRig, dt: number): void;
  /** The player's hand is on the camera (camera.ts `onTake`): give way this frame. True when it set `focus`. */
  take(rig: CameraRig): boolean;
  /** A new battle: clear the log and start again on a wide shot. */
  reset(rig: CameraRig): void;
  /** The inset camera, in the battle frame, while a picture-in-picture is open. */
  pipView(): { eye: V3; target: V3; pip: Pip } | null;
  snapshot(): DirectorSnapshot;
}

export interface DirectorSnapshot {
  on: boolean;
  mode: CameraMode;
  t: number;
  shot: Shot | null;
  log: Shot[];
  shots: number;
  byKind: Record<ShotKind, number>;
  /** Shots per 20 s of battle (WORLD-01 check 7), and the longest gap between two shots. */
  shotsPer20s: number;
  maxGap: number;
  modeLog: { t: number; mode: CameraMode; why: string }[];
  idle: number;
  pip: Pip | null;
  pipLog: Pip[];
  pending: Beat[];
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const gone = (s: ShipView | undefined) => !s || s.status === 'fled' || s.status === 'withdrawn';
const dist3 = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** The camera yaw that stands `off` radians round from dead astern of a ship heading `h` (camera.ts eyeOf convention). */
function yawFrom(h: V3, off: number): number {
  const bx = -h[0], bz = -h[2];
  const x = bx * Math.cos(off) - bz * Math.sin(off);
  const z = bx * Math.sin(off) + bz * Math.cos(off);
  return Math.atan2(x, z);
}

function centroid(ships: ShipView[]): { c: V3; r: number } {
  if (!ships.length) return { c: [0, 0, 0], r: 0 };
  const c: V3 = [0, 0, 0];
  for (const s of ships) for (let i = 0; i < 3; i++) c[i] += s.pos[i] / ships.length;
  let r = 0;
  for (const s of ships) r = Math.max(r, dist3(s.pos, c));
  return { c, r };
}

export function createDirector(opts: DirectorOptions): Director {
  const D = DIRECTOR;
  let seen = -1;
  let beats: Beat[] = [];
  let shot: Shot | null = null;
  let log: Shot[] = [];
  let modeLog: DirectorSnapshot['modeLog'] = [];
  let pip: Pip | null = null;
  let pipLog: Pip[] = [];
  let pipCam: CamGoal | null = null;
  let pipYaw = 0;
  let idle = 0;
  let inputs = 0;
  let wides = 0;
  let cam: CamGoal | null = null;
  let shotYaw = 0;
  let shotPitch = 0;
  let hits: { t: number; target: string }[] = [];
  let opened = new Set<string>();
  let turns = new Map<string, { a: number; held: number; last: number }>();
  let endT: number | null = null;
  let lastT = 0;
  let mode: CameraMode = 'director';
  let frame: BattleFrame | null = null;

  const ship = (id: string | null | undefined) => (id && frame ? frame.ships.find((s) => s.id === id) : undefined);
  const nameOf = (id: string) => ship(id)?.name ?? id;
  const len = (s: ShipView) => opts.lengths[s.cls] ?? 7;
  /** PKG-15: how far back the camera must stand for a sphere of radius `r` to fill at most `fill` of the narrower
   * angle of the lens. A hull is held whole whichever way it lies. */
  const fit = (r: number, fill: number, lens: { fov: number; aspect: number }) => {
    const half = (lens.fov * Math.PI) / 360;
    const narrow = Math.min(Math.tan(half), Math.tan(half) * lens.aspect);
    return r / (fill * Math.max(1e-3, narrow));
  };
  const mainLens = () => opts.lens?.() ?? D.lens;

  const beat = (kind: string, id: string, reason: string, t: number, group?: string[]): Beat | null => {
    const b = BEATS[kind];
    if (!b || !ship(id)) return null;
    const out: Beat = { t, kind, ship: id, reason, prio: b.prio, shot: b.shot, big: b.big, ...(group ? { group } : {}) };
    beats.push(out);
    return out;
  };

  /** Turn the battle's new log events into beats. Returns the beats raised this step. */
  const read = (src: LogSource | null, f: BattleFrame): Beat[] => {
    const fresh: Beat[] = [];
    const add = (b: Beat | null) => { if (b) fresh.push(b); };
    if (!src) {
      // The stub feed has no sim log: film what it says on comms.
      for (const e of f.events) if (e.ship) add(beat(e.kind === 'out' ? 'wrecked' : 'break', e.ship, e.text, e.t));
      return fresh;
    }
    const total = src.logDropped + src.log.length;
    if (seen < 0) seen = src.logDropped;
    const n = Math.min(total - seen, src.log.length);
    for (let i = src.log.length - n; i < src.log.length; i++) {
      const e = src.log[i];
      switch (e.kind) {
        case 'shot': {
          if (!e.hit) break;
          hits.push({ t: e.t, target: e.target });
          const tgt = ship(e.target);
          const key = `${e.target}:${e.side}`;
          // An enemy's open side is seen only as fire reaching her hull.
          if (e.hullDmg > 0 && tgt?.side === 1 && !opened.has(key)) {
            opened.add(key);
            add(beat('hullOpen', e.target, `${nameOf(e.target)}: fire through her ${e.side} side`, e.t, [e.ship, e.target]));
          }
          break;
        }
        case 'shieldDown':
          if (ship(e.ship)?.side === 0) add(beat('shieldDown', e.ship, `${nameOf(e.ship)}: ${e.side} shield down`, e.t));
          break;
        case 'boardLaunch':
          if (!e.reinforcing) add(beat('boardLaunch', e.target, `boarding run: ${nameOf(e.ship)} on ${nameOf(e.target)}`, e.t, [e.ship, e.target]));
          break;
        case 'breach': add(beat('breach', e.ship, `boarders breach ${nameOf(e.ship)}, ${e.side} side`, e.t)); break;
        case 'captured': add(beat('captured', e.ship, `${nameOf(e.ship)} taken by boarding`, e.t)); break;
        case 'repelled': add(beat('repelled', e.ship, `${nameOf(e.ship)} throws off her boarders`, e.t)); break;
        case 'scuttled': add(beat('scuttled', e.ship, `${nameOf(e.ship)} is scuttled`, e.t)); break;
        case 'break': add(beat('break', e.ship, `${nameOf(e.ship)} breaks and runs`, e.t)); break;
        case 'flagshipLost': add(beat('flagshipLost', e.ship, `the flagship ${nameOf(e.ship)} falls`, e.t)); break;
        case 'out':
          if (e.how === 'wrecked') add(beat('wrecked', e.ship, `${nameOf(e.ship)} breaks apart`, e.t));
          else if (e.how === 'struck') add(beat('struck', e.ship, `${nameOf(e.ship)} strikes her colours`, e.t));
          break;
        case 'sideBroken': {
          const side = e.side === 'player' ? 0 : 1;
          const line = f.ships.filter((s) => s.side === side && underWay(s.status));
          const lead = line.find((s) => s.flagship) ?? line[0];
          if (lead) add(beat('sideBroken', lead.id, `the ${f.sides[side].name} line breaks`, e.t, line.map((s) => s.id)));
          break;
        }
        default: break;
      }
    }
    seen = total;
    return fresh;
  };

  /** A flagship turning hard enough, for long enough, is a beat (from the frame: the view's headings). */
  const watchTurns = (f: BattleFrame, dt: number, fresh: Beat[]) => {
    if (dt <= 0) return;
    for (const s of f.ships) {
      if (!s.flagship || !underWay(s.status)) continue;
      const a = Math.atan2(s.heading[2], s.heading[0]);
      const st = turns.get(s.id);
      if (!st) { turns.set(s.id, { a, held: 0, last: -Infinity }); continue; }
      const rate = Math.abs(wrap(a - st.a)) / dt;
      st.a = a;
      st.held = rate > D.flagshipTurn.rate ? st.held + dt : 0;
      if (st.held >= D.flagshipTurn.sustain && f.t - st.last >= D.flagshipTurn.cooldown) {
        st.last = f.t;
        st.held = 0;
        const b = beat('flagshipTurn', s.id, `the flagship ${s.name ?? s.id} turns`, f.t);
        if (b) fresh.push(b);
      }
    }
  };

  /** Where a shot of this kind puts the camera now (it tracks its subject; the yaw drifts slowly while it holds). */
  const goalFor = (kind: ShotKind, subject: string | null, group: string[] | undefined, yaw: number, pitch: number, el: number, lens = mainLens()): CamGoal => {
    const f = frame!;
    const drifted = yaw + D.ease.drift * el;
    if (kind === 'wide') {
      const field = f.ships.filter((s) => underWay(s.status));
      const { c, r } = centroid(field.length ? field : f.ships);
      return { target: c, dist: clamp(r * D.wide.holdBoth, D.wide.min, D.wide.max), yaw: drifted, pitch };
    }
    const members = (group ?? []).map((id) => ship(id)).filter((s): s is ShipView => !gone(s));
    const subj = ship(subject);
    if (kind === 'medium' || members.length > 1) {
      const held = members.length ? members : subj ? [subj] : [];
      const { c, r } = centroid(held);
      // The group's radius plus half the longest hull in it: every hull in the shot is held whole.
      const reach = r + Math.max(0, ...held.map((s) => len(s) / 2));
      const dist = kind === 'medium'
        ? Math.min(D.medium.max, Math.max(clamp(r * D.medium.spread, D.medium.min, D.medium.max), fit(reach, D.medium.fill, lens)))
        : Math.max(D.close.min, subj ? len(subj) * D.close.k : 0, r * 2 * D.close.pairSpread, fit(reach, D.close.fill, lens));
      return { target: c, dist, yaw: drifted, pitch };
    }
    if (!subj) return cam ?? { target: [0, 0, 0], dist: D.wide.min, yaw: drifted, pitch };
    return { target: [...subj.pos], dist: Math.max(D.close.min, len(subj) * D.close.k, fit(len(subj) / 2, D.close.fill, lens)), yaw: drifted, pitch };
  };

  const goal = (): CamGoal => goalFor(shot!.kind, shot!.subject, shot!.group, shotYaw, shotPitch, frame!.t - shot!.t);

  const start = (kind: ShotKind, reason: string, subject: string | null, group: string[] | undefined, prio: number, forced?: Transition) => {
    const f = frame!;
    const transition: Transition = forced ?? (shot ? D.transition[`${shot.kind}>${kind}`] : 'cut');
    shot = { t: f.t, kind, subject, reason, transition, prio, ...(group ? { group } : {}) };
    if (kind === 'wide') {
      const a = D.wide.angles[wides++ % D.wide.angles.length];
      shotYaw = forced === 'move' && cam ? cam.yaw : a.yaw; // a hand-back keeps the angle he chose and pulls back
      shotPitch = a.pitch;
    } else {
      const s = ship(subject);
      const off = kind === 'close' ? D.close.yawOff : D.medium.yawOff;
      shotYaw = s ? yawFrom(s.heading, off) : cam?.yaw ?? 0;
      shotPitch = kind === 'close' ? D.close.pitch : D.medium.pitch;
    }
    if (cam && transition === 'move') {
      // Turn the short way round.
      shotYaw = cam.yaw + wrap(shotYaw - cam.yaw);
    }
    log.push(shot);
    if (log.length > D.logMax) log = log.slice(-D.logMax);
    if (transition === 'cut' || !cam) cam = goal();
  };

  const best = (): Beat | null => {
    let b: Beat | null = null;
    for (const x of beats) if (!b || x.prio > b.prio || (x.prio === b.prio && x.t > b.t)) b = x;
    return b;
  };

  const cutTo = (b: Beat) => {
    beats = beats.filter((x) => x !== b && x.ship !== b.ship);
    start(b.shot, b.reason, b.ship, b.group, b.prio);
  };

  /** The medium shot when nothing big is happening: the group round the ship taking the most hits just now. */
  const hotGroup = (): { lead: ShipView; group: string[] } | null => {
    const f = frame!;
    const count = new Map<string, number>();
    for (const h of hits) count.set(h.target, (count.get(h.target) ?? 0) + 1);
    let lead: ShipView | undefined;
    let n = 0;
    for (const s of f.ships) if (underWay(s.status) && (count.get(s.id) ?? 0) > n) { n = count.get(s.id)!; lead = s; }
    lead ??= f.ships.find((s) => s.side === 0 && s.flagship && underWay(s.status)) ?? f.ships.find((s) => underWay(s.status));
    if (!lead) return null;
    const group = f.ships.filter((s) => underWay(s.status) && dist3(s.pos, lead!.pos) <= D.medium.radius).map((s) => s.id);
    return { lead, group };
  };

  const choose = () => {
    const f = frame!;
    if (f.outcome) {
      if (shot?.reason !== 'the battle is over') start('wide', 'the battle is over', null, undefined, 0);
      return;
    }
    if (!shot) { start('wide', 'opening: both fleets', null, undefined, 0); return; }
    const el = f.t - shot.t;
    if (shot.kind !== 'wide' && gone(ship(shot.subject))) { start('wide', 'her subject left the field', null, undefined, 0); return; }
    const b = best();
    if (b && b.prio >= D.interruptPrio && b.prio > shot.prio && el >= D.minHold[shot.kind]) { cutTo(b); return; }
    if (el < D.hold[shot.kind]) return;
    if (shot.kind !== 'wide') { start('wide', 'wide again between beats', null, undefined, 0); return; }
    if (b) { cutTo(b); return; }
    const hot = hotGroup();
    if (hot) start('medium', `the fight round ${hot.lead.name ?? hot.lead.id}`, hot.lead.id, hot.group, 1);
    else start('wide', 'the shape of the battle', null, undefined, 0);
  };

  const ease = (dt: number) => {
    const g = goal();
    const c = cam!;
    const el = frame!.t - shot!.t;
    const moving = shot!.transition === 'move' && el < 3 / D.ease.move;
    const kt = 1 - Math.exp(-(moving ? D.ease.move : D.ease.track) * dt);
    const km = 1 - Math.exp(-D.ease.move * dt);
    for (let i = 0; i < 3; i++) c.target[i] += (g.target[i] - c.target[i]) * kt;
    c.dist += (g.dist - c.dist) * km;
    c.yaw += wrap(g.yaw - c.yaw) * km;
    c.pitch += (g.pitch - c.pitch) * km;
  };

  const pipStep = (fresh: Beat[], dt: number) => {
    const f = frame!;
    if (pip && (f.t >= pip.until || gone(ship(pip.subject)))) { pip = null; pipCam = null; }
    for (const b of fresh) {
      if (!b.big) continue;
      const s = ship(b.ship);
      if (!s || opts.visible?.(s)) continue;
      if (pip && b.prio < pip.prio && f.t - pip.t < D.minHold.close) continue;
      pip = { t: f.t, until: f.t + D.pip.life, kind: b.kind, subject: b.ship, reason: b.reason, prio: b.prio, ...(b.group ? { group: b.group } : {}) };
      pipLog.push(pip);
      pipYaw = yawFrom(s.heading, D.close.yawOff);
      pipCam = goalFor('close', b.ship, b.group, pipYaw, D.close.pitch, 0, D.pip);
    }
    if (pip && pipCam) {
      const g = goalFor('close', pip.subject, pip.group, pipYaw, D.close.pitch, f.t - pip.t, D.pip);
      const k = 1 - Math.exp(-D.ease.track * dt);
      for (let i = 0; i < 3; i++) pipCam.target[i] += (g.target[i] - pipCam.target[i]) * k;
      pipCam.dist = g.dist;
      pipCam.yaw = g.yaw;
    }
  };

  const handBack = (rig: CameraRig) => {
    const s = rig.state;
    mode = 'director';
    s.mode = 'director';
    s.focus = null;
    pip = null;
    pipCam = null;
    modeLog.push({ t: frame!.t, mode, why: `no camera input for ${D.handBack} s` });
    cam = { target: [...s.target], dist: s.dist, yaw: s.yaw, pitch: s.pitch };
    start('wide', 'hand-back: a slow move out from his picture', null, undefined, 0, 'move');
  };

  const director: Director = {
    step(f, src, rig, dt) {
      frame = f;
      lastT = f.t;
      if (!flagOn('director')) { mode = rig.state.mode; return; }
      const fresh = read(src, f);
      watchTurns(f, dt, fresh);
      beats = beats.filter((b) => f.t - b.t <= D.beatLife && !gone(ship(b.ship)));
      hits = hits.filter((h) => f.t - h.t <= D.hot.window);
      if (f.outcome && endT === null) endT = f.t;
      if (rig.state.inputs !== inputs) { inputs = rig.state.inputs; idle = 0; }
      if (rig.state.mode === 'player') {
        if (mode !== 'player') { mode = 'player'; modeLog.push({ t: f.t, mode, why: 'player input' }); }
        idle += dt;
        pipStep(fresh, dt);
        if (idle < D.handBack) return;
        handBack(rig);
      }
      choose();
      ease(dt);
      aimRig(rig, cam!);
      rig.state.focus = null;
    },
    take(rig) {
      if (!flagOn('director')) return false;
      idle = 0;
      inputs = rig.state.inputs;
      if (mode !== 'player') { mode = 'player'; modeLog.push({ t: lastT, mode, why: 'player input' }); }
      // His camera starts on what the director was showing, and follows it if it was a ship.
      rig.state.focus = shot && shot.kind !== 'wide' ? shot.subject : null;
      return true;
    },
    reset(rig) {
      seen = -1;
      beats = [];
      shot = null;
      log = [];
      modeLog = [];
      pip = null;
      pipLog = [];
      pipCam = null;
      idle = 0;
      inputs = rig.state.inputs;
      wides = 0;
      cam = null;
      hits = [];
      opened = new Set();
      turns = new Map();
      endT = null;
      lastT = 0;
      if (flagOn('director')) { rig.state.mode = 'director'; rig.state.focus = null; mode = 'director'; }
    },
    pipView() {
      if (!pip || !pipCam) return null;
      const s = { mode: 'player' as CameraMode, yaw: pipCam.yaw, pitch: pipCam.pitch, dist: pipCam.dist, target: pipCam.target, focus: null, eye: [0, 0, 0] as V3, inputs: 0 };
      return { eye: eyeOf(s), target: [...pipCam.target], pip };
    },
    snapshot() {
      const byKind: Record<ShotKind, number> = { wide: 0, medium: 0, close: 0 };
      for (const s of log) byKind[s.kind]++;
      const T = endT ?? lastT;
      const within = log.filter((s) => s.t <= T);
      let maxGap = 0;
      for (let i = 0; i < within.length; i++) maxGap = Math.max(maxGap, (i + 1 < within.length ? within[i + 1].t : T) - within[i].t);
      return {
        on: flagOn('director'), mode, t: lastT, shot, log: [...log], shots: log.length, byKind,
        shotsPer20s: T > 0 ? +(within.length / (T / 20)).toFixed(3) : 0, maxGap: +maxGap.toFixed(2),
        modeLog: [...modeLog], idle: +idle.toFixed(2), pip, pipLog: [...pipLog], pending: [...beats],
      };
    },
  };
  return director;
}
