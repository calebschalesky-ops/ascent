/**
 * The tactical view's numbers (PKG-12). Every one is first-pass and look-or-feel only: none changes the battle except
 * `timeScale`, which is how fast the battle runs on screen, never what happens in it.
 */
export const TAC = {
  /** Game seconds per real second while the tactical view is open (VISION §7a: 25%, never 0). */
  timeScale: 0.25,
  /** Back to this when it closes (VISION §7a: "back to 1x"). */
  normalScale: 1,

  // ── The tactical camera: top-down-ish over the middle of the battle ──
  /** Pitch, radians above the ring plane (1.57 is straight down; a little off it keeps the depth readable). */
  pitch: 1.18,
  /** Distance, battle units, before the "hold both fleets" pull-back takes over. */
  dist: 320,
  /** Pulled back to this many times the farthest ship's distance from the middle, until he moves the camera. */
  holdK: 3,
  /** On a tall screen the table turns this far (radians) so the two lines stand as columns, his on the left. */
  tallTurn: Math.PI / 2,

  // ── The hologram ──
  /** PKG-21: how long a commit that ordered nothing (a refusal, no target) stays on screen, ms. First-pass. */
  noticeMs: 4500,

  /** Renderer exposure while open, as a fraction of the normal one: hulls and planet go faint, the icons carry it. */
  exposureK: 0.38,
  /** Grid on the ring plane: spacing and half-extent in battle units (40 m a unit: 25 units is 1 km). */
  gridStep: 25,
  gridHalf: 750,
  /** Grid line brightness (HDR, before the dimmed exposure) and opacity. */
  gridGain: 2.4,
  gridOpacity: 0.32,
  /** The holotable under the grid: how much of the planet and rings it hides, and its height (below every ship). */
  tableOpacity: 0.84,
  tableY: -6,

  // ── Icons and shield arcs, screen px ──
  icon: { escort: 8, destroyer: 9, cruiser: 12, carrier: 13, capital: 16, fighter: 5 } as Record<string, number>,
  /** Arc radius beyond the icon, px. */
  arcGap: 9, // PKG-22 (F-03): 6 -> 9, the arcs clear the icon at 1280
  /** Arc stroke at an even split (0.25); a heavier side draws thicker, up to arcMax. */
  arcWidth: 3.6, // PKG-22: 2.8 -> 3.6
  /** The thinnest an arc is drawn, px (a side with little power still reads). */
  arcMin: 3, // PKG-22: 2.2 -> 3
  arcMax: 7, // PKG-22: 6 -> 7
  /** Gap left between neighbouring arcs, radians. */
  arcPad: 0.16,
  /** An enemy side last seen holding fades to this opacity after `staleS` seconds (it may have changed since). */
  staleS: 45,
  staleFloor: 0.35,

  // ── Ghost line and paths ──
  /** A maneuver's remaining path is re-flown (pilot only, never the RNG) this often, battle seconds. */
  pathRefreshS: 3,
  /** Path points kept per drawn path at most (thinned evenly beyond). */
  pathMaxPts: 120,
  /** EXP-03 step 4 probe: the flown track must stay within this of the ghost line, metres (PKG-10's MAN.previewTolM). */
  ghostTolM: 50,
  /** Withdraw order line: drawn this far ahead along the ship's course, metres. */
  withdrawLineM: 2500,
};
