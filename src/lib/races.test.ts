import { describe, expect, it } from 'vitest';
import { NATIONS } from './nations';
import { CLASS_IDS, PEOPLES, RACES, SHIP_TYPES, STATION_COUNT_REF, TYPE_LENGTH, peopleOf, raceOf, shipClassOf } from './races';

describe('races', () => {
  it('every non-player nation has exactly one race, and the player’s has none', () => {
    for (const n of NATIONS) {
      const mine = RACES.filter((r) => r.id === n.id);
      expect(mine.length).toBe(n.player ? 0 : 1);
    }
    expect(RACES.length).toBe(NATIONS.filter((n) => !n.player).length);
  });
  it('each race lives at its nation’s home and gives the nation its name', () => {
    for (const r of RACES) {
      const n = NATIONS.find((x) => x.id === r.id)!;
      expect(r.home).toBe(n.home);
      expect(n.name).toBe(r.name);
    }
  });
  it('names, demonyms and lines are filled in and the names are distinct', () => {
    for (const r of RACES) for (const s of [r.name, r.demonym, r.line]) expect(s.trim().length).toBeGreaterThan(0);
    expect(new Set(RACES.map((r) => r.name)).size).toBe(RACES.length);
    expect(raceOf('earth')).toBeUndefined();
    expect(raceOf('mars')?.name).toBe('Quirites');
  });
});

describe('peoples', () => {
  it('there is one people for every nation, Earth included, and the races agree with them', () => {
    expect(PEOPLES.map((p) => p.nation).sort()).toEqual(NATIONS.map((n) => n.id).sort());
    expect(peopleOf('earth').name).toBe('Humans');
    for (const r of RACES) {
      const p = peopleOf(r.id);
      expect([p.name, p.demonym, p.line]).toEqual([r.name, r.demonym, r.line]);
    }
  });

  it('each people has exactly one class per ship type, at that type’s length', () => {
    for (const p of PEOPLES) {
      for (const t of SHIP_TYPES) {
        const of = p.ships.filter((s) => s.kind === t);
        expect(of.length, `${p.nation} ${t}`).toBe(1);
        expect(of[0].length).toBe(TYPE_LENGTH[t]);
        expect(shipClassOf(p.nation, t)).toBe(of[0]);
      }
      // Anything else is a race-only extra, at most one.
      const extra = p.ships.filter((s) => !SHIP_TYPES.includes(s.kind as never));
      expect(extra.every((s) => s.kind === 'special')).toBe(true);
      expect(extra.length).toBeLessThanOrEqual(1);
    }
  });

  it('class ids and names are unique across the system, and ids start with their nation', () => {
    const all = PEOPLES.flatMap((p) => p.ships.map((s) => ({ ...s, nation: p.nation })));
    expect(new Set(all.map((s) => s.id)).size).toBe(all.length);
    expect(new Set(all.map((s) => s.name)).size).toBe(all.length);
    for (const s of all) {
      expect(s.id.startsWith(`${s.nation}-`)).toBe(true);
      expect(s.id).toMatch(/^[a-z]+-[a-z-]+$/);
      for (const f of [s.role, s.line]) expect(f.trim().length).toBeGreaterThan(0);
      expect(s.length).toBeGreaterThan(0);
    }
    expect(CLASS_IDS.mars).toEqual({ capital: 'mars-rostrata', cruiser: 'mars-corvus', fighter: 'mars-velite' });
  });

  it('every government is a different type and every field is written', () => {
    expect(new Set(PEOPLES.map((p) => p.government.type)).size).toBe(PEOPLES.length);
    for (const p of PEOPLES) {
      for (const f of Object.values(p.government)) expect(f.trim().length, p.nation).toBeGreaterThan(0);
      for (const f of Object.values(p.culture)) expect(f.trim().length, p.nation).toBeGreaterThan(0);
    }
  });

  it('each people has one capital, a named station for each station on the stations branch, and an outpost', () => {
    for (const p of PEOPLES) {
      expect(p.bases.filter((b) => b.kind === 'capital').length, p.nation).toBe(1);
      expect(p.bases.filter((b) => b.kind === 'outpost').length, p.nation).toBeGreaterThan(0);
      const stations = p.bases.filter((b) => b.kind === 'station');
      expect(stations.map((b) => b.id), p.nation).toEqual(
        Array.from({ length: STATION_COUNT_REF[p.nation] }, (_, i) => `stn-${p.nation}-${i + 1}`));
    }
    const ids = PEOPLES.flatMap((p) => p.bases.map((b) => b.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('the codex accent is the nation colour', () => {
    for (const p of PEOPLES) expect(p.palette.accent).toBe(NATIONS.find((n) => n.id === p.nation)!.color);
  });

  it('no astrology or occult words in any text (the game removed them on purpose)', () => {
    const text = JSON.stringify(PEOPLES).toLowerCase();
    for (const w of ['zodiac', 'astrolog', 'horoscope', 'hermetic', 'occult', 'alchem', 'planetary hour', 'sign of the'])
      expect(text.includes(w), w).toBe(false);
  });
});
