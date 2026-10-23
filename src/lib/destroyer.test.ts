/**
 * Caleb's destroyer, 2026-10-19, as tests: each relation he stated fails here if a later edit to any ship's numbers
 * breaks it. DESTROYER.md quotes him.
 */
import { describe, expect, it } from 'vitest';
import { craftStats } from './craftStats';
import { BY_SIZE, COMMAND_POINTS, ENEMY_AI_CLASS, HULL, firepower } from './destroyer';
import { CRAFT_SLOTS, HANGAR_SLOTS, capacity, fits } from './hangars';
import { NATIONS } from './nations';
import { LOADOUTS, SLOTS, fitProblem, fitStats, loadoutOf } from './progression/catalog';
import { raceRef } from './progression/refs';
import { FORCE, SHIP_SPECS, SHIP_TYPES } from './shipTypes';

const D = 'destroyer' as const;

describe('the destroyer, as Caleb described it', () => {
  it('is larger than a cruiser and smaller than a capital ship', () => {
    expect(SHIP_SPECS[D].size).toBeGreaterThan(SHIP_SPECS.cruiser.size);
    expect(SHIP_SPECS[D].size).toBeLessThan(SHIP_SPECS.capital.size);
    expect(BY_SIZE).toEqual(['fighter', 'cruiser', 'destroyer', 'capital']);
    // Bigger than a cruiser to shoot at, smaller than a capital; its hit sphere still covers its hull.
    expect(SHIP_SPECS[D].hitRadius).toBeGreaterThan(SHIP_SPECS.cruiser.hitRadius);
    expect(SHIP_SPECS[D].hitRadius).toBeLessThan(SHIP_SPECS.capital.hitRadius);
    expect(SHIP_SPECS[D].hitRadius).toBeGreaterThanOrEqual(SHIP_SPECS[D].size / 2);
  });

  it('is lighter than a capital ship', () => {
    expect(HULL[D].mass).toBeLessThan(HULL.capital.mass);
    expect(HULL[D].mass).toBeGreaterThan(HULL.cruiser.mass); // it is still the bigger hull
  });

  it('is faster than both the cruiser and the capital ship (fleet-command and enemy-ai tables)', () => {
    for (const t of ['cruiser', 'capital'] as const) {
      expect(HULL[D].speed).toBeGreaterThan(HULL[t].speed);
      expect(HULL[D].accel).toBeGreaterThan(HULL[t].accel);
      expect(ENEMY_AI_CLASS[D].speed).toBeGreaterThan(ENEMY_AI_CLASS[t].speed);
      expect(ENEMY_AI_CLASS[D].accel).toBeGreaterThan(ENEMY_AI_CLASS[t].accel);
      expect(SHIP_SPECS[D].patrolSpeed).toBeGreaterThan(SHIP_SPECS[t].patrolSpeed);
    }
  });

  it('is more agile than both: turns faster, and sidesteps a missile more often', () => {
    for (const t of ['cruiser', 'capital'] as const) {
      expect(HULL[D].turn).toBeGreaterThan(HULL[t].turn);
      expect(ENEMY_AI_CLASS[D].turn).toBeGreaterThan(ENEMY_AI_CLASS[t].turn);
      expect(SHIP_SPECS[D].dodge).toBeGreaterThan(SHIP_SPECS[t].dodge);
    }
  });

  it('out-guns the cruiser and has slightly less firepower than the capital ship', () => {
    expect(firepower(D)).toBeGreaterThan(firepower('cruiser'));
    expect(firepower(D)).toBeLessThan(firepower('capital'));
    expect(firepower(D) / firepower('capital')).toBeGreaterThanOrEqual(0.7); // "slightly"
    expect(SLOTS[D].weapon).toBeGreaterThan(SLOTS.cruiser.weapon);
    expect(SLOTS[D].weapon).toBeLessThan(SLOTS.capital.weapon);
  });

  it('every race’s destroyer loadout out-guns its cruiser and sits just under its capital ship', () => {
    for (const n of NATIONS) {
      const dps = (t: 'capital' | 'cruiser' | 'destroyer') => fitStats(loadoutOf(n.id, t)).dps;
      expect(dps(D), n.id).toBeGreaterThan(dps('cruiser'));
      expect(dps(D), n.id).toBeLessThan(dps('capital'));
      expect(dps(D) / dps('capital'), n.id).toBeGreaterThanOrEqual(0.7);
      expect(fitProblem(LOADOUTS[n.id][D], D, 2), n.id).toBeNull();
      // Lighter than the capital in hit points too, heavier than the cruiser.
      expect(craftStats(n.id, D).hp).toBeLessThan(craftStats(n.id, 'capital').hp);
      expect(craftStats(n.id, D).hp).toBeGreaterThan(craftStats(n.id, 'cruiser').hp);
      expect(raceRef(n.id).ships[D]).toMatch(/^[A-Z]/);
    }
  });

  it('carries fewer small craft than a cruiser: the one place the cruiser wins', () => {
    expect(HANGAR_SLOTS[D]).toBeLessThan(HANGAR_SLOTS.cruiser);
    expect(HANGAR_SLOTS[D]).toBeGreaterThan(0);
    for (const c of Object.keys(CRAFT_SLOTS) as (keyof typeof CRAFT_SLOTS)[]) {
      expect(capacity(D, c), c).toBeLessThanOrEqual(capacity('cruiser', c));
    }
    expect(capacity(D, 'fighter')).toBeLessThan(capacity('cruiser', 'fighter'));
    expect(capacity(D, 'drone')).toBeLessThan(capacity('cruiser', 'drone'));
    expect(HANGAR_SLOTS.cruiser).toBeLessThan(HANGAR_SLOTS.capital);
  });

  it('sits between the cruiser and the capital ship in command points', () => {
    expect(COMMAND_POINTS[D]).toBeGreaterThan(COMMAND_POINTS.cruiser);
    expect(COMMAND_POINTS[D]).toBeLessThan(COMMAND_POINTS.capital);
  });

  it('every nation fields one destroyer', () => {
    expect(FORCE[D]).toBe(1);
    for (const n of NATIONS) expect(n.force[D]).toBe(1);
    expect(SHIP_TYPES).toContain(D);
  });
});

describe('hangars', () => {
  it('keeps progression’s cruiser bay (4 fighters) and fleet-command’s Captain bay (8 fighters)', () => {
    expect(capacity('cruiser', 'fighter')).toBe(4);
    expect(fits('capital', { fighter: 8 })).toBe(true);
    expect(fits('capital', { fighter: 8, boarder: 2 })).toBe(true);
    expect(fits('capital', { fighter: 8, boarder: 3 })).toBe(false);
  });
  it('costs drones at four a slot and boarders and dropships at two slots each', () => {
    expect(capacity('destroyer', 'drone')).toBe(8);
    expect(capacity('destroyer', 'boarder')).toBe(1);
    expect(capacity('cruiser', 'dropship')).toBe(2);
    expect(fits('destroyer', { fighter: 1, drone: 4 })).toBe(true);
    expect(fits('destroyer', { fighter: 2, drone: 1 })).toBe(false);
    expect(capacity('fighter', 'drone')).toBe(0);
  });
});
