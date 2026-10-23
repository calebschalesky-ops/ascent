/**
 * Feature flags (HOUSE-RULES 3: new systems ship behind a flag, on only once their steps pass).
 * Append-only: add your flag at the end, never reorder or remove another package's line.
 * Flags are read at runtime; `setFlag` changes one for this page only (the probe's `flag(name, on)`), nothing is saved.
 */
export interface Flag { name: string; on: boolean; note: string }

export const FLAGS: Flag[] = [
  { name: 'skirmish', on: true, note: 'PKG-03: the skirmish mode. On (PKG-21, Daedalus 2026-10-21 F-01): the title screen offers "Fleet battle". Off: no title-screen entry; ?skirmish still loads it for testing.' },
  { name: 'director', on: true, note: 'PKG-11: the battle films itself (shot list, gives way to the player, hand-back, picture-in-picture). Off: the PKG-04 camera.' },
  { name: 'tactical', on: true, note: 'PKG-12: the tactical view (T: 25% time, hologram, shield arcs), the maneuver picker with ghost lines, and order lines for every standing order. Off: none of it.' },
  { name: 'fighters', on: true, note: 'PKG-25: fighter wings drawn on screen (normal and tactical). On (PKG-25 steps pass). The sim flies wings whenever fighter command gives a task; off: they fly but are not drawn.' },
];

export const flagOn = (name: string): boolean => FLAGS.find((f) => f.name === name)?.on ?? false;

/** Turn a flag on or off for this page. Returns false when there is no such flag. */
export function setFlag(name: string, on: boolean): boolean {
  const f = FLAGS.find((x) => x.name === name);
  if (!f) return false;
  f.on = on;
  return true;
}
