import { describe, expect, it } from 'vitest';
import type { V3 } from '../nav';
import type { ConquestState } from '../conquest/state';
import { hitSite, newConquest } from '../conquest/state';
import { KINDS } from '../conquest/sites';
import type { Carrier, CarrierCtx, InfantryState } from './carrier';
import { CARRIER, carrierSlots, enemyTarget, landingFire, landingProblem, newCarrier, newInfantry, orderLanding, orderReturn, refill, stepCarrier, stepEnemyCarrier } from './carrier';
import { fullLoad } from './carrier';
import { menOf } from './squads';

const SITE: V3 = [1000, 0, 0];
const UP: V3 = [1, 0, 0];

function world(): { c: ConquestState; inf: InfantryState; car: Carrier } {
  const c = newConquest('earth');
  const inf = newInfantry();
  const car = newCarrier(inf, 'player', 'earth', 'Gangway', [1000, 0, 200]);
  car.phase = 'standby';
  return { c, inf, car };
}
/** Shoot a site down to `share` of its structure (the batteries are wrecked first, so the hits land in full). */
const shell = (c: ConquestState, id: string, share: number) => { const k = KINDS[id.endsWith('quirinal') ? 'capital' : id.endsWith('tharsis') ? 'city' : id.includes('prima') || id.includes('secunda') ? 'fort' : 'works']; hitSite(c, id, k.hp * (1 - share)); };
const clearGuns = (c: ConquestState) => { hitSite(c, 'mars-limes', 1e6); };

function run(c: ConquestState, inf: InfantryState, car: Carrier, secs: number, ctx: Partial<CarrierCtx> = {}) {
  const evs: string[] = [];
  const cq: string[] = [];
  for (let t = 0; t < secs && car.phase !== 'standby' && car.phase !== 'lost'; t += 0.5) {
    c.clock += 0.5;
    const fire = ctx.fire ?? (car.site ? landingFire(c, car.site, 0, car.phase !== 'descent') : 0);
    const r = stepCarrier(c, inf, car, 0.5, { site: { pos: SITE, up: UP }, ship: [0, 0, 0], fire, contested: false, ...ctx });
    evs.push(...r.ev.map((e) => e.kind));
    cq.push(...r.conquest.map((e) => e.kind));
  }
  return { evs, cq };
}

describe('the infantry carrier', () => {
  it('the player gets one from level 3 and a second from level 6', () => {
    expect([1, 3, 5, 6, 10].map(carrierSlots)).toEqual([0, 1, 1, 2, 2]);
  });

  it('refuses an intact site, a battery, and a city whose forts stand (conquest’s rules)', () => {
    const { c, car } = world();
    expect(landingProblem(c, car, 'mars-mines')).toMatch(/defences are up/);
    expect(landingProblem(c, car, 'mars-limes')).toMatch(/cannot be held/);
    expect(landingProblem(c, car, 'mars-tharsis')).toMatch(/forts still stand/);
    expect(landingProblem(c, car, 'earth-pharos')).toMatch(/not theirs/); // the player's own world
  });

  it('refuses a suppressed site while the world’s guns would shoot it down', () => {
    const { c, car } = world();
    shell(c, 'mars-mines', 0.4); // batteries still up: the hit lands at half, so the works is at 70%... shoot more
    hitSite(c, 'mars-mines', 1e3);
    expect(c.sites['mars-mines'].hp).toBeLessThanOrEqual(KINDS.works.hp * 0.5);
    // the Limes battery (8) and both forts (5 each): 18 a second over 20 s on the way down is 360 > 0.8 × 320
    expect(landingFire(c, 'mars-mines')).toBe(18);
    expect(orderLanding(c, car, 'mars-mines')).toMatch(/too hot/);
    expect(car.phase).toBe('standby');
  });

  it('lands at a cleared site, beats the garrison, holds, and the site changes hands with its reward', () => {
    const { c, inf, car } = world();
    clearGuns(c);
    shell(c, 'mars-prima', 0.45);
    shell(c, 'mars-secunda', 0.45);
    shell(c, 'mars-mines', 0.4);
    expect(landingFire(c, 'mars-mines')).toBe(0);
    expect(orderLanding(c, car, 'mars-mines')).toBeNull();
    const { evs, cq } = run(c, inf, car, 400);
    expect(evs).toEqual(['landed', 'fighting', 'won', 'captured', 'lifted']);
    expect(cq).toContain('captured');
    expect(cq).toContain('reward');
    expect(c.sites['mars-mines'].owner).toBe('player');
    expect(inf.garrisons['mars-mines']).toHaveLength(1);
    expect(car.squads.length).toBe(CARRIER.bays - 1);
    expect(car.hp).toBe(320); // nothing was shooting
    expect(car.phase).toBe('standby');
  });

  it('a forced landing at a defended site is shot down on the way in, troops and all', () => {
    const { c, inf, car } = world();
    hitSite(c, 'mars-mines', 1e3); // suppressed, but every gun of the world still works
    expect(orderLanding(c, car, 'mars-mines', { force: true })).toBeNull();
    const { evs } = run(c, inf, car, 200);
    expect(evs).toEqual(['lost']);
    expect(car.phase).toBe('lost');
    expect(car.squads).toEqual([]);
    expect(c.sites['mars-mines'].owner).toBe('native');
  });

  it('a garrison too strong for the troops aboard is refused; forced, the troops are repulsed and re-embark', () => {
    const { c, inf, car } = world();
    car.squads = fullLoad('earth', 'x', 'line', 2);
    clearGuns(c);
    shell(c, 'mars-prima', 0.45);
    expect(landingProblem(c, car, 'mars-prima')).toMatch(/garrison would hold/);
    orderLanding(c, car, 'mars-prima', { force: true });
    const { evs } = run(c, inf, car, 800);
    expect(evs).toContain('repulsed');
    expect(c.sites['mars-prima'].owner).toBe('native');
    expect(car.phase).toBe('standby');
    expect(menOf(car.squads)).toBeGreaterThan(0);
  });

  it('their ships near the site pause the hold; it resumes when they go', () => {
    const { c, inf, car } = world();
    clearGuns(c);
    shell(c, 'mars-prima', 0.45); shell(c, 'mars-secunda', 0.45); shell(c, 'mars-mines', 0.4);
    orderLanding(c, car, 'mars-mines');
    while (car.phase !== 'hold') run(c, inf, car, 0.5);
    const h = car.hold;
    run(c, inf, car, 30, { contested: true });
    expect(car.hold).toBe(h);
    expect(c.sites['mars-mines'].owner).toBe('native');
    run(c, inf, car, 60);
    expect(c.sites['mars-mines'].owner).toBe('player');
  });

  it('troops in a site stop it mending above half, so a long fight does not undo the shelling', () => {
    const { c, inf, car } = world();
    clearGuns(c);
    shell(c, 'mars-prima', 0.45);
    shell(c, 'mars-secunda', 0.45);
    orderLanding(c, car, 'mars-prima');
    run(c, inf, car, 400);
    expect(c.sites['mars-prima'].owner).toBe('player');
  });

  it('carriers take a world: forts, then the capital, and the world is controlled', () => {
    const { c, inf, car } = world();
    clearGuns(c);
    for (const id of ['mars-prima', 'mars-secunda']) { shell(c, id, 0.45); car.squads = fullLoad('earth', id); orderLanding(c, car, id); run(c, inf, car, 600); }
    shell(c, 'mars-quirinal', 0.3);
    car.squads = fullLoad('earth', 'q', 'shock');
    expect(orderLanding(c, car, 'mars-quirinal')).toBeNull();
    const { cq } = run(c, inf, car, 600);
    expect(cq).toContain('control');
    expect(c.worlds.mars.controlled).toBe(true);
  });

  it('survives a save and reload mid-operation: the reloaded copy ends the same way', () => {
    const { c, inf, car } = world();
    clearGuns(c);
    shell(c, 'mars-prima', 0.45); shell(c, 'mars-secunda', 0.45); shell(c, 'mars-mines', 0.4);
    orderLanding(c, car, 'mars-mines');
    while (car.phase !== 'fight') run(c, inf, car, 0.5);
    const saved = JSON.parse(JSON.stringify({ c, inf }));
    const a = run(c, inf, car, 400);
    const b = run(saved.c, saved.inf, saved.inf.carriers[0], 400);
    expect(b).toEqual(a);
    expect(saved.c.sites['mars-mines'].owner).toBe('player');
  });

  it('recalled, it docks and refills its bays for credits', () => {
    const { c, inf, car } = world();
    car.squads = fullLoad('earth', 'r', 'line', 3);
    car.squads[0].men = 5;
    orderReturn(car);
    run(c, inf, car, 60, { site: undefined });
    expect(car.phase).toBe('docked');
    const cost = refill(car, 1000);
    expect(car.squads).toHaveLength(CARRIER.bays);
    expect(cost).toBe(20 + 3 * 40);
    expect(refill(car, 1000)).toBe(0);
  });

  it('an enemy world sends a carrier at the player’s weakest site while it has a shipyard; it can retake it', () => {
    const { c, inf, car } = world();
    clearGuns(c);
    shell(c, 'mars-prima', 0.45); shell(c, 'mars-secunda', 0.45); shell(c, 'mars-mines', 0.4);
    orderLanding(c, car, 'mars-mines');
    run(c, inf, car, 400);
    expect(enemyTarget(c, inf, 'mars', () => true)).toBeNull(); // the pilot is guarding it
    expect(enemyTarget(c, inf, 'mars', () => false)).toBe('mars-mines');
    inf.garrisons['mars-mines'][0].men = 3; // a battered garrison
    const foe = newCarrier(inf, 'mars', 'mars', 'Actuaria', [1000, 0, 300], fullLoad('mars', 'e', 'line', 4));
    foe.site = 'mars-mines';
    foe.phase = 'transit' as Carrier['phase'];
    const evs: string[] = [];
    for (let t = 0; t < 300 && foe.phase !== 'gone' && foe.phase !== 'lost'; t += 0.5) evs.push(...stepEnemyCarrier(c, inf, foe, 0.5, { site: { pos: SITE, up: UP }, ship: [0, 0, 0], fire: 0, contested: false }).map((e) => e.kind));
    expect(evs).toEqual(['landed', 'fighting', 'captured', 'lifted']);
    expect(c.sites['mars-mines'].owner).toBe('native');
    expect(c.sites['mars-mines'].hp).toBe(KINDS.works.hp * 0.5);
  });

  it('an enemy carrier that meets a full garrison is beaten off; and the pilot can shoot it down', () => {
    const { c, inf } = world();
    c.sites['mars-mines'].owner = 'player';
    inf.garrisons['mars-mines'] = fullLoad('earth', 'g', 'line', 3);
    const foe = newCarrier(inf, 'mars', 'mars', 'Actuaria', [1000, 0, 300], fullLoad('mars', 'e', 'line', 2));
    foe.site = 'mars-mines'; foe.phase = 'transit' as Carrier['phase'];
    const evs: string[] = [];
    for (let t = 0; t < 400 && foe.phase !== 'gone' && foe.phase !== 'lost'; t += 0.5) evs.push(...stepEnemyCarrier(c, inf, foe, 0.5, { site: { pos: SITE, up: UP }, ship: [0, 0, 0], fire: 0, contested: false }).map((e) => e.kind));
    expect(evs).toContain('repulsed');
    expect(c.sites['mars-mines'].owner).toBe('player');
    const foe2 = newCarrier(inf, 'mars', 'mars', 'Actuaria', [1000, 0, 300], fullLoad('mars', 'f', 'line', 4));
    foe2.site = 'mars-mines'; foe2.phase = 'descent' as Carrier['phase'];
    for (let t = 0; t < 30 && foe2.phase !== 'lost'; t += 0.5) stepEnemyCarrier(c, inf, foe2, 0.5, { site: { pos: SITE, up: UP }, ship: [0, 0, 0], fire: 20, contested: false });
    expect(foe2.phase).toBe('lost');
  });
});

describe('the infantry save', () => {
  it('reads back a state mid-fight, and repairs what it cannot read', async () => {
    const { migrateInfantry } = await import('./persist');
    const { c, inf, car } = world();
    clearGuns(c);
    shell(c, 'mars-prima', 0.45); shell(c, 'mars-secunda', 0.45); shell(c, 'mars-mines', 0.4);
    orderLanding(c, car, 'mars-mines');
    while (car.phase !== 'fight') run(c, inf, car, 0.5);
    const back = migrateInfantry(JSON.parse(JSON.stringify(inf)))!;
    expect(back).toEqual(JSON.parse(JSON.stringify(inf)));
    expect(migrateInfantry(null)).toBeNull();
    const bad = migrateInfantry({ v: 1, carriers: [{ id: 'c9', side: 'player', nation: 'earth', phase: 'fight', site: 'nowhere', hp: 1e9 }, { phase: 'warp' }], garrisons: { nowhere: [] } })!;
    expect(bad.carriers).toHaveLength(1);
    expect(bad.carriers[0].phase).toBe('standby');
    expect(bad.carriers[0].hp).toBe(320);
    expect(bad.garrisons).toEqual({});
    expect(bad.next).toBe(10);
  });
});

describe('a site that mended', () => {
  it('troops cannot hold a site above half: they pull out rather than hold for ever', () => {
    const { c, inf, car } = world();
    clearGuns(c);
    shell(c, 'mars-prima', 0.45); shell(c, 'mars-secunda', 0.45); shell(c, 'mars-mines', 0.4);
    orderLanding(c, car, 'mars-mines');
    while (car.phase !== 'hold') run(c, inf, car, 0.5);
    c.sites['mars-mines'].hp = KINDS.works.hp * 0.9; // mended while they flew in
    const { evs } = run(c, inf, car, 60);
    expect(evs).toContain('aborted');
    expect(car.phase).toBe('standby');
    expect(c.sites['mars-mines'].owner).toBe('native');
    expect(menOf(car.squads)).toBeGreaterThan(0);
  });
  it('the site does not mend from the moment the carrier starts down', () => {
    const { c, inf, car } = world();
    clearGuns(c);
    shell(c, 'mars-prima', 0.45); shell(c, 'mars-secunda', 0.45); shell(c, 'mars-mines', 0.4);
    orderLanding(c, car, 'mars-mines');
    while (car.phase !== 'descent') run(c, inf, car, 0.5);
    run(c, inf, car, 10);
    expect(c.sites['mars-mines'].lastHit).toBeGreaterThan(c.clock - 1);
  });
});
