/**
 * Foreign space (scale-jump-danger D1, 2026-10-21). Caleb: "I traveled to Earth and didn't get attacked once. That's a
 * problem. I was a Jupiter ship." Earth regards Jupiter at +10 (Wary), so its fleets only shadowed, and only from a few
 * ship lengths: nothing ever came out to meet a foreign ship parked off Earth.
 *
 * Now every house's home world has a space (its orbit zone, nav.ts `orbitZone`), and a ship entering it is judged:
 * - **own** (the host is your house) and **passage** (the two houses are allied for passage: the mean of how each regards
 *   the other is at least `PASSAGE.mean`, the Friendly band's floor) fly in peace;
 * - **enemy** (a blood feud, or the host regards you as Hostile) is engaged at once;
 * - anyone else is **challenged**: a warning on the channel, and if you are still in its space `CHALLENGE.warn` seconds
 *   later, or you fire on its ships first, its patrols and its station guns are weapons free.
 * Weapons free lasts until you leave that space. The standings table and the lore are untouched; this reads them.
 *
 * Why the mean of both ways: Earth holds the Moon close (45) while the Moon calls Earth a wary daughter (15). Passage is
 * a matter between two houses, and the brief rules that Earth at the Moon stays peaceful; no pair starts in the Allied
 * band (60+), so reading "allied" as that band would make every foreign world hostile. Earth and Jupiter regard each
 * other at 10 both ways: mean 10, challenged.
 */
import type { DestGeo, V3 } from '../nav';
import { dist, orbitZone } from '../nav';
import type { NationId } from '../nations';
import { NATIONS } from '../nations';
import type { Standings } from './standings';
import { BANDS, bandOf, isBlood } from './standings';

export const PASSAGE = { mean: BANDS.friendly } as const;
/** Seconds between the warning and weapons free, for a ship that stays. */
export const CHALLENGE = { warn: 15 } as const;

export type Standing = 'own' | 'passage' | 'challenge' | 'enemy';

/** How a house's home space treats a ship of `guest`'s house. */
export function standingAt(s: Standings, host: NationId, guest: NationId): Standing {
  if (host === guest) return 'own';
  if (isBlood(host, guest) || bandOf(s, host, guest) === 'hostile' || bandOf(s, host, guest) === 'blood') return 'enemy';
  return (s.v[host][guest] + s.v[guest][host]) / 2 >= PASSAGE.mean ? 'passage' : 'challenge';
}

/** The house whose home space holds `pos` (the nearest home body whose orbit zone it is in), or null. */
export function homeSpaceOf(pos: V3, geo: DestGeo[]): NationId | null {
  let best: NationId | null = null;
  let gap = Infinity;
  for (const n of NATIONS) {
    const g = geo.find((x) => x.id === n.home);
    if (!g) continue;
    const d = dist(pos, g.pos);
    if (d < orbitZone(g) && d - g.size < gap) { best = n.id; gap = d - g.size; }
  }
  return best;
}

export interface Challenge {
  /** The space you are in, and how long you have been in it. */
  host: NationId | null;
  t: number;
  warned: boolean;
  /** Houses whose patrols and guns are free to fire on you. */
  free: Partial<Record<NationId, boolean>>;
}
export const newChallenge = (): Challenge => ({ host: null, t: 0, warned: false, free: {} });

export type ChallengeEvent =
  | { kind: 'warn'; host: NationId; seconds: number }
  | { kind: 'engage'; host: NationId; why: 'enemy' | 'stayed' | 'fired' }
  | { kind: 'clear'; host: NationId };

/**
 * One frame. `host` is the space you are in now (homeSpaceOf), `standing` how it treats you, `fired` whether you shot at
 * its ships since the last frame. Mutates `c`; returns what happened, for the channel.
 */
export function stepChallenge(c: Challenge, dt: number, host: NationId | null, standing: Standing | null, fired = false): ChallengeEvent[] {
  const ev: ChallengeEvent[] = [];
  if (host !== c.host) {
    if (c.host) {
      if (c.free[c.host] || c.warned) ev.push({ kind: 'clear', host: c.host });
      delete c.free[c.host];
    }
    c.host = host;
    c.t = 0;
    c.warned = false;
  }
  if (!host || !standing || standing === 'own' || standing === 'passage') return ev;
  if (c.free[host]) return ev;
  if (standing === 'enemy') { c.free[host] = true; ev.push({ kind: 'engage', host, why: 'enemy' }); return ev; }
  if (!c.warned) { c.warned = true; ev.push({ kind: 'warn', host, seconds: CHALLENGE.warn }); }
  c.t += dt;
  if (fired || c.t >= CHALLENGE.warn) { c.free[host] = true; ev.push({ kind: 'engage', host, why: fired ? 'fired' : 'stayed' }); }
  return ev;
}

/** The line on the channel for an event. */
export function channelLine(e: ChallengeEvent, hostName: string, guestName: string): string {
  if (e.kind === 'warn') return `CHANNEL · ${hostName} control: ${guestName} ship, you are in ${hostName} space. Leave within ${e.seconds} seconds or be fired on.`;
  if (e.kind === 'clear') return `CHANNEL · ${hostName} control: you have left ${hostName} space.`;
  return e.why === 'enemy' ? `CHANNEL · ${hostName} control: ${guestName} ship sighted. All ships, engage.`
    : e.why === 'fired' ? `CHANNEL · ${hostName} control: we are fired on. Weapons free.`
      : `CHANNEL · ${hostName} control: you were warned. Weapons free.`;
}
