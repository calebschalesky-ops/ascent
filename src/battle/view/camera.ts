/**
 * The player's camera over the battle, and the command layer that moves it. Pointer, wheel and keys call these
 * commands, and so does the probe (`__probe.act('camera.orbit', {yaw: 0.2})`): one path, so a test drives what a
 * player drives. Plain maths, no three.js, so it can be tested in Node.
 *
 * `mode` is EXP-04 step 3: the director (director/) frames the battle while mode is 'director', and any camera command
 * hands the camera to the player in the same frame. The director hears that through `onTake` (it names what it was
 * looking at, so his camera starts from the director's picture rather than jumping), and counts `inputs` to know how
 * long he has left the camera alone.
 */
import type { V3 } from './model';

/** The camera's tunable numbers. First-pass. */
export const CAM = {
  /** Start: a little ahead of the lines, outboard of the battle, the planet behind it. */
  yaw: 0.5,
  pitch: 0.17,
  dist: 175,
  minDist: 25,
  maxDist: 900,
  minPitch: -1.35,
  maxPitch: 1.35,
  /** How fast the look-at point follows the middle of the battle, per second (0..1 per second, exponential). */
  follow: 1.6,
};

export type CameraMode = 'player' | 'director';

export interface CameraState {
  mode: CameraMode;
  yaw: number;
  pitch: number;
  dist: number;
  /** The point looked at, in the battle frame. */
  target: V3;
  /** The ship the camera follows, if the player picked one; otherwise the middle of the battle. */
  focus: string | null;
  /** Battle frame position of the eye. */
  eye: V3;
  /** Player camera inputs so far (every command counts): the director's idle clock restarts on a change. */
  inputs: number;
}

export interface CameraRig {
  state: CameraState;
  /** Ease the look-at point toward `goal` over dt seconds. */
  follow(goal: V3, dt: number): void;
  /** Snap the look-at point (on a reset or a seed). */
  snap(goal: V3): void;
  /**
   * Called on the frame the player takes the camera from the director, before the move is applied. Returns true when
   * it has set `focus` to what the director was showing: the look-at point then eases there instead of snapping.
   */
  onTake?: () => boolean;
  /** Set by a take: the next `snap` keeps the look-at point where it is (the input frame never jumps). */
  easeNext?: boolean;
}

/** Put the camera where the director wants it (director mode only): look-at point, distance and angles. */
export function aimRig(rig: CameraRig, goal: { target: V3; dist: number; yaw: number; pitch: number }): void {
  const s = rig.state;
  s.target = [...goal.target];
  s.dist = clamp(goal.dist, CAM.minDist, CAM.maxDist);
  s.yaw = goal.yaw;
  s.pitch = clamp(goal.pitch, CAM.minPitch, CAM.maxPitch);
  s.eye = eyeOf(s);
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export function eyeOf(s: CameraState): V3 {
  const c = Math.cos(s.pitch);
  return [s.target[0] + Math.sin(s.yaw) * c * s.dist, s.target[1] + Math.sin(s.pitch) * s.dist, s.target[2] + Math.cos(s.yaw) * c * s.dist];
}

export function createCameraRig(): CameraRig {
  const state: CameraState = { mode: 'director', yaw: CAM.yaw, pitch: CAM.pitch, dist: CAM.dist, target: [0, 0, 0], focus: null, eye: [0, 0, 0], inputs: 0 };
  state.eye = eyeOf(state);
  const rig: CameraRig = {
    state,
    follow(goal, dt) {
      const k = 1 - Math.exp(-CAM.follow * dt);
      for (let i = 0; i < 3; i++) state.target[i] += (goal[i] - state.target[i]) * k;
      state.eye = eyeOf(state);
    },
    snap(goal) {
      if (rig.easeNext) rig.easeNext = false; // the input frame: keep the director's picture, follow() eases from it
      else state.target = [...goal];
      state.eye = eyeOf(state);
    },
  };
  return rig;
}

export type CommandArgs = Record<string, unknown>;
export type Command = (args: CommandArgs) => unknown;

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** The camera verbs. Every one hands the camera to the player. */
export function cameraCommands(rig: CameraRig): Record<string, Command> {
  const s = rig.state;
  const done = () => { s.eye = eyeOf(s); return { ...s, target: [...s.target], eye: [...s.eye] }; };
  /** The player's hand on the camera: this frame, whatever the director was doing. */
  const take = () => {
    s.inputs++;
    if (s.mode === 'player') return;
    s.mode = 'player';
    if (rig.onTake?.()) rig.easeNext = true;
  };
  return {
    /**
     * Any player camera move in one verb (the probe's `act('camera', {...})`): `yaw`/`pitch` radians to orbit, `zoom`
     * a distance factor, `ship` to follow one ship. Hands the camera to the player like every other verb.
     */
    camera: (a) => {
      take();
      s.yaw += num(a.yaw);
      s.pitch = clamp(s.pitch + num(a.pitch), CAM.minPitch, CAM.maxPitch);
      s.dist = clamp(s.dist * num(a.zoom, 1), CAM.minDist, CAM.maxDist);
      if (typeof a.ship === 'string') s.focus = a.ship;
      return done();
    },
    /** Turn round the look-at point by `yaw` and `pitch` radians. */
    'camera.orbit': (a) => {
      take();
      s.yaw += num(a.yaw);
      s.pitch = clamp(s.pitch + num(a.pitch), CAM.minPitch, CAM.maxPitch);
      return done();
    },
    /** Move in (factor < 1) or out (factor > 1). */
    'camera.zoom': (a) => {
      take();
      s.dist = clamp(s.dist * num(a.factor, 1), CAM.minDist, CAM.maxDist);
      return done();
    },
    /** Follow one ship by id, or the whole battle with no id. */
    'camera.focus': (a) => {
      take();
      s.focus = typeof a.ship === 'string' ? a.ship : null;
      return done();
    },
    /** Back to the opening framing. */
    'camera.reset': () => {
      take();
      s.yaw = CAM.yaw;
      s.pitch = CAM.pitch;
      s.dist = CAM.dist;
      s.focus = null;
      return done();
    },
  };
}
