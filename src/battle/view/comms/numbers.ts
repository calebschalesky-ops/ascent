/** The comms UI's tunable numbers (look and feel, not rules). First-pass: Palamedes and Zeuxis may move any of them. */
export const COMMS_UI = {
  /** One click on a shield side moves this much of the split toward it, taken evenly from the other three. */
  shieldStep: 0.15,
  /** No shield side is ever powered below this fraction by the UI. */
  shieldFloor: 0.05,
  /** Pointer travel, px, under which a press on the battle counts as a click (pick) rather than a drag (orbit). */
  clickSlop: 5,
  /** A click within this many px of a ship's projected centre picks it; the nearest centre wins (PKG-17, pick.ts). */
  pickRadius: 30,
  /** A hull under the pointer counts as this many px away, so a ship whose centre is nearer still wins (PKG-17). */
  pickHullPx: 12,
  /** The hover ring's radius, px: smaller than the selection and target rings (16) so the three read apart. */
  hoverRing: 12,
  /** How long a refusal or a notice stays on screen, real seconds. */
  noticeS: 4,
  /** Most status lines the queue shows under the decisions (the rest are folded by the flag lieutenant anyway). */
  statusShown: 3,
};
