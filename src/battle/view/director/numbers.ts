/**
 * The director's tunable numbers (PKG-11). Look only: nothing here reaches the battle. All first-pass, for Caleb to
 * overrule (shot lengths, hand-back, PiP size and corner are named as assumptions in reports/PKG-11.md).
 *
 * Units: seconds of battle time, battle units (40 m of the sim each), radians.
 */
/** Wide holds both fleets with Saturn; medium a group round the hottest fight; close one subject. */
export type ShotKind = 'wide' | 'medium' | 'close';

export type Transition = 'cut' | 'move';

export const DIRECTOR = {
  /** How long each kind of shot holds before the director moves on (s). */
  hold: { wide: 8, medium: 6, close: 5.5 } as Record<ShotKind, number>,
  /** A bigger beat may cut in once the current shot has held this long (s). */
  minHold: { wide: 2.5, medium: 2.5, close: 3 } as Record<ShotKind, number>,
  /** Beats at or above this priority may cut into a shot that is still holding. */
  interruptPrio: 8,
  /** A beat is worth cutting to for this long after it happens (s). */
  beatLife: 7,
  /** How the director gets from one kind of shot to the next: a cut, or a slow move of the camera. */
  transition: {
    'wide>wide': 'move', 'wide>medium': 'move', 'wide>close': 'cut',
    'medium>wide': 'move', 'medium>medium': 'cut', 'medium>close': 'cut',
    'close>wide': 'cut', 'close>medium': 'cut', 'close>close': 'cut',
  } as Record<`${ShotKind}>${ShotKind}`, Transition>,
  /** Easing rates, per second (exponential). `move`: a slow move between shots and a hand-back; `track`: keeping a
   * moving subject in the middle of the frame; `drift`: the slow turn of the camera during a held shot (rad/s). */
  ease: { move: 0.85, track: 4, drift: 0.03 },
  /** Wide: stand off this many times the battle's radius, within these distances; the angles cycle shot by shot.
   * yaw 0.5 / pitch 0.17 is the opening shot (camera.ts CAM), with Saturn and the ring plane behind the lines. */
  wide: {
    holdBoth: 2.2, min: 175, max: 900,
    angles: [{ yaw: 0.5, pitch: 0.17 }, { yaw: 0.2, pitch: 0.3 }, { yaw: 0.8, pitch: 0.12 }],
  },
  /** Medium: a group of ships round the hottest fight. `fill` (PKG-15): the group, out to the ends of its hulls, fills
   * at most this fraction of the lens's narrower angle (within `max`). */
  medium: { radius: 70, spread: 2.4, min: 55, max: 260, pitch: 0.22, yawOff: 1.25, fill: 0.85 },
  /** Close: the subject's length times `k` away, three-quarter from astern (`yawOff` from dead astern), a little above.
   * `fill` (PKG-15): the subject's whole hull (or the pair's, out to their ends) fills at most this fraction of the
   * lens's narrower angle, so a capital is never cropped at the frame edge, on a phone held upright either. */
  close: { k: 3.4, min: 24, pairSpread: 1.5, pitch: 0.16, yawOff: 0.85, fill: 0.7 },
  /** The main camera's lens when the view does not say (scene.ts LOOK.fov; a 16:10 screen). */
  lens: { fov: 46, aspect: 16 / 10 },
  /** Hot fight: hits on a ship in the last `window` seconds pick the medium shot's group. */
  hot: { window: 6 },
  /** A flagship turning: heading rate above `rate` rad/s (a capital turns at most 0.07) held `sustain` s; once per
   * `cooldown` s per ship. */
  flagshipTurn: { rate: 0.035, sustain: 2, cooldown: 30 },
  /** Player hands-off time before the director takes the camera back, with a slow move (assumed 8 s). */
  handBack: 8,
  /**
   * Picture-in-picture while the player holds the camera: a big moment elsewhere opens a small inset from a second
   * camera for `life` s. Width is a fraction of the stage, clamped in CSS px;
   * top-right corner, `gap` px below the side chips and never above `top`.
   * A moment already on his screen (inside `onScreen` of the frame centre and nearer than `nearK` × its length) opens
   * no inset. `bloomRes` (PKG-15): the inset's bloom pass resolution (the main view's is 256).
   */
  pip: { life: 5, width: 0.3, minPx: 168, maxPx: 380, aspect: 16 / 10, top: 92, gap: 8, right: 12, fov: 40, onScreen: 0.8, nearK: 14, bloomRes: 128 },
  /** The shot log keeps this many entries (a 15-minute battle at the shot lengths above is under 200). */
  logMax: 600,
};

/**
 * What the director will cut to, by battle event. `prio` orders beats; `big` opens picture-in-picture while the
 * player holds the camera. Shield sides opening are filmed only on his own ships (an enemy's shields reach the view
 * only as hits: VISION §7a "Seeing is not knowing"); on an enemy, the first hit through to the hull on a side is the
 * beat.
 */
export const BEATS: Record<string, { prio: number; shot: ShotKind; big: boolean }> = {
  captured: { prio: 9, shot: 'close', big: true },
  flagshipLost: { prio: 9, shot: 'close', big: true },
  breach: { prio: 8, shot: 'close', big: true },
  wrecked: { prio: 8, shot: 'close', big: true },
  sideBroken: { prio: 8, shot: 'medium', big: false },
  struck: { prio: 7, shot: 'close', big: true },
  boardLaunch: { prio: 7, shot: 'close', big: false },
  scuttled: { prio: 6, shot: 'close', big: false },
  repelled: { prio: 6, shot: 'close', big: false },
  break: { prio: 6, shot: 'close', big: false },
  flagshipTurn: { prio: 5, shot: 'close', big: false },
  shieldDown: { prio: 5, shot: 'close', big: false },
  hullOpen: { prio: 4, shot: 'close', big: false },
};
