import { describe, expect, it } from 'vitest';
import { CHALLENGE, PASSAGE, channelLine, homeSpaceOf, newChallenge, standingAt, stepChallenge } from './territory';
import { newStandings, shotAt } from './standings';
import { destGeometry, orbitZone } from '../nav';
import type { V3 } from '../nav';

const geo = destGeometry();
const at = (id: string) => geo.find((g) => g.id === id)!;

describe('foreign space: who is welcome (D1)', () => {
  const s = newStandings();
  it('lets a house in its own space and its allies through, by the mean of both ways at the Friendly floor', () => {
    expect(PASSAGE.mean).toBe(20);
    expect(standingAt(s, 'earth', 'earth')).toBe('own');
    expect(standingAt(s, 'moon', 'earth')).toBe('passage'); // Moon 15 → Earth, Earth 45 → Moon: mean 30
    expect(standingAt(s, 'earth', 'moon')).toBe('passage');
    expect(standingAt(s, 'earth', 'venus')).toBe('passage'); // 30 and 35
  });
  it('challenges Jupiter at Earth (10 both ways) and engages Mars at Earth at once (blood)', () => {
    expect(standingAt(s, 'earth', 'jupiter')).toBe('challenge');
    expect(standingAt(s, 'earth', 'mars')).toBe('enemy');
    expect(standingAt(s, 'saturn', 'jupiter')).toBe('challenge'); // Saturn wary of Jupiter, Jupiter's claim on Saturn: -20, -50 → mean -35, not hostile from Saturn's side
  });
  it('turns enemy once a shot drops the host to Hostile', () => {
    const t = newStandings();
    shotAt(t, 'earth', 'jupiter');
    expect(standingAt(t, 'earth', 'jupiter')).toBe('enemy');
  });
  it('knows whose space a point is in: inside a home world’s orbit zone, else none', () => {
    const e = at('earth');
    expect(homeSpaceOf([e.pos[0] + e.size * 1.2, 0, 0], geo)).toBe('earth');
    expect(homeSpaceOf([e.pos[0] + orbitZone(e) * 1.01, 0, 0], geo)).toBeNull();
    const j = at('jupiter');
    expect(homeSpaceOf([j.pos[0], j.pos[1] + j.size * 2, j.pos[2]] as V3, geo)).toBe('jupiter');
  });
});

describe('foreign space: the challenge timer (D1)', () => {
  it('warns on entry and goes weapons free after CHALLENGE.warn seconds in the space', () => {
    const c = newChallenge();
    const first = stepChallenge(c, 0.1, 'earth', 'challenge');
    expect(first).toEqual([{ kind: 'warn', host: 'earth', seconds: CHALLENGE.warn }]);
    let free = false;
    let t = 0.1;
    while (!free && t < 60) { const ev = stepChallenge(c, 0.1, 'earth', 'challenge'); t += 0.1; free = ev.some((e) => e.kind === 'engage'); }
    expect(CHALLENGE.warn).toBe(15);
    expect(t).toBeGreaterThanOrEqual(CHALLENGE.warn);
    expect(t).toBeLessThan(CHALLENGE.warn + 0.25);
    expect(c.free.earth).toBe(true);
  });
  it('goes weapons free at once when you fire on them, and at once for a blood enemy', () => {
    const c = newChallenge();
    stepChallenge(c, 0.1, 'earth', 'challenge');
    expect(stepChallenge(c, 0.1, 'earth', 'challenge', true)).toEqual([{ kind: 'engage', host: 'earth', why: 'fired' }]);
    const m = newChallenge();
    expect(stepChallenge(m, 0.1, 'earth', 'enemy')).toEqual([{ kind: 'engage', host: 'earth', why: 'enemy' }]);
  });
  it('leaves an ally alone, and forgets a challenge once you leave the space', () => {
    const a = newChallenge();
    for (let i = 0; i < 300; i++) expect(stepChallenge(a, 0.1, 'moon', 'passage')).toEqual([]);
    expect(a.free.moon).toBeUndefined();
    const c = newChallenge();
    for (let i = 0; i < 200; i++) stepChallenge(c, 0.1, 'earth', 'challenge');
    expect(c.free.earth).toBe(true);
    expect(stepChallenge(c, 0.1, null, null)).toEqual([{ kind: 'clear', host: 'earth' }]);
    expect(c.free.earth).toBeUndefined();
    expect(stepChallenge(c, 0.1, 'earth', 'challenge')[0].kind).toBe('warn'); // back in: warned again, the clock from 0
  });
  it('says it on the channel', () => {
    expect(channelLine({ kind: 'warn', host: 'earth', seconds: 15 }, 'Earth', 'Diadochoi')).toContain('Leave within 15 seconds');
    expect(channelLine({ kind: 'engage', host: 'earth', why: 'stayed' }, 'Earth', 'Diadochoi')).toContain('Weapons free');
  });
});
