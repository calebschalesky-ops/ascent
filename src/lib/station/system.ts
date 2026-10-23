/**
 * One station's systems, stepped together: power first (what is working and how hard), then the alert, repairs, the
 * guns, the hangar, the market, the temple and development, and what it all gives the world's meters. Pure; the
 * scene calls `stepStation` once a frame per station and acts on the orders it returns.
 */
import type { V3 } from '../nav';
import type { StationHome } from '../stations';
import type { Tier } from './civic';
import { BASE_PRICE, DEVELOPMENT, TIERS, activeBoon, develop, fitted, marketIncome, powerBudget, price, stationMeters } from './civic';
import type { Contact, FireOrder, StationSys } from './defence';
import { DEFENCE, fireOrders, newStation, status, stepAlert, stepRepair, workingMounts } from './defence';
import type { Hardpoint } from './mounts';
import type { Hangar, NavyOrders } from './navy';
import { newHangar, stepHangar } from './navy';
import type { Boon, Resource, StationProfile } from './profiles';
import { BOON_TEXT, PROFILES } from './profiles';
import { MUNITIONS } from '../munitions';
import { SHIELDS } from '../shields';

export interface StationRun {
  profile: StationProfile;
  mounts: Hardpoint[]; // every hardpoint the body offers
  fit: Hardpoint[]; // those fitted at the current tier
  sys: StationSys;
  hangar: Hangar;
  dev: number; // development points toward the next tier
  income: number; // credits its market has paid its world so far
}

export function createStation(id: string, home: StationHome, mounts: Hardpoint[], tier: Tier = 2): StationRun {
  const profile = PROFILES[home];
  const fit = fitted(mounts, tier, profile);
  return { profile, mounts, fit, sys: newStation(id, profile, fit, tier), hangar: newHangar(TIERS[tier].housed, profile.wing), dev: 0, income: 0 };
}

export interface StationWorld {
  at: V3; // the station's centre
  contacts: Contact[];
  planet: { pos: V3; r: number } | null;
  economy?: number; // the world's economy meter (planets'); 50 when absent
  rand: () => number;
}

export interface StationStep {
  fire: FireOrder[];
  navy: NavyOrders;
  boon: Boon | null;
  power: { supply: number; demand: number; turret: number; shield: number };
  meters: Record<'government' | 'military' | 'religion' | 'economy', number>;
  marketOpen: boolean;
  tierReady: boolean; // development points are there for the next tier (resources and the purchase are conquest's / the player's)
}

export function stepStation(run: StationRun, dt: number, w: StationWorld): StationStep {
  const { sys, profile } = run;
  const fighting = sys.alert === 'engaged' || sys.alert === 'siege';
  const working = workingMounts(sys, run.fit);
  const budget = powerBudget(working, profile.power.richness, fighting, run.fit);
  const temple = working.some((m) => m.kind === 'temple') && budget.share.temple > 0.5;
  const boon = activeBoon(profile, temple);
  const range = DEFENCE.sensor * (boon === 'nightWatch' ? 1.25 : 1) * (working.some((m) => m.kind === 'sensor') ? 1 : 0.5);
  stepAlert(sys, w.contacts, w.at, range, dt, boon);
  const drydock = working.some((m) => m.kind === 'drydock') && budget.share.drydock > 0.5;
  const shieldPower = working.some((m) => m.kind === 'shieldEmitter') ? budget.share.shieldEmitter : 0;
  stepRepair(sys, dt, shieldPower, drydock || !fighting); // the yard works on its own guns between fights
  const fire = fireOrders(sys, working, {
    contacts: w.contacts, planet: w.planet, boon, rand: w.rand,
    power: { turret: budget.share.turret, pointDefence: budget.share.pointDefence, minelayer: budget.share.minelayer },
  });
  const mouths = working.filter((m) => m.kind === 'hangar').length;
  const navy = stepHangar(run.hangar, sys.alert, dt, budget.share.hangar > 0.5 ? mouths : 0, boon);
  const economy = w.economy ?? 50;
  const fightingNow = sys.alert === 'engaged' || sys.alert === 'siege'; // the alert may have just changed
  const marketOpen = !fightingNow && !fighting && working.some((m) => m.kind === 'market') && budget.share.market > 0.5;
  if (marketOpen) run.income += (marketIncome(economy, budget.share.market, boon) * dt) / 60;
  run.dev += develop(dt, economy, Math.min(1, budget.supply / Math.max(1, budget.demand)), sys.alert === 'calm', boon);
  const tierReady = sys.tier < 3 && run.dev >= DEVELOPMENT.points[(sys.tier + 1) as 2 | 3];
  return {
    fire, navy, boon, marketOpen, tierReady,
    power: { supply: budget.supply, demand: budget.demand, turret: budget.share.turret, shield: shieldPower },
    meters: stationMeters(working, budget.share),
  };
}

/** Buy the next tier (its points are spent; the resources or credits are the caller's to take). Refits the station. */
export function upgrade(run: StationRun): boolean {
  const next = (run.sys.tier + 1) as Tier;
  if (run.sys.tier >= 3 || run.dev < DEVELOPMENT.points[next as 2 | 3]) return false;
  run.dev -= DEVELOPMENT.points[next as 2 | 3];
  const fresh = createStation(run.sys.id, run.profile.home, run.mounts, next);
  // Keep the fight and the damage taken: structure carries over as a share.
  for (const [id, s] of Object.entries(fresh.sys.sections)) {
    const old = run.sys.sections[id];
    if (old) s.def.hull = s.def.maxHull * (old.def.hull / old.def.maxHull);
  }
  fresh.sys.alert = run.sys.alert;
  fresh.sys.provoked = run.sys.provoked;
  fresh.sys.stats = run.sys.stats;
  for (const t of ['fighter', 'cruiser'] as const) fresh.hangar.out[t] = Math.min(run.hangar.out[t], fresh.hangar.housed[t]);
  for (const t of ['fighter', 'cruiser'] as const) fresh.hangar.housed[t] -= fresh.hangar.out[t];
  run.fit = fresh.fit;
  run.sys = fresh.sys;
  run.hangar = fresh.hangar;
  return true;
}

/** Everything the station screen shows, read from a station and its last step. */
export function summary(run: StationRun, step: StationStep | undefined, economy = 50) {
  const { sys, profile } = run;
  const st = status(sys);
  const guns: Record<string, number> = {};
  for (const m of Object.values(sys.mounts)) if (m.munition && m.hp > 0) guns[MUNITIONS[m.munition].name] = (guns[MUNITIONS[m.munition].name] ?? 0) + 1;
  const open = step?.marketOpen ?? false;
  const prices = (Object.keys(BASE_PRICE) as Resource[]).map((r) => ({ resource: r, local: r === profile.market, ...(price(r, profile, economy, open, step?.boon ?? null) ?? { sell: 0, buy: 0 }) }));
  const next = sys.tier < 3 ? DEVELOPMENT.points[(sys.tier + 1) as 2 | 3] : null;
  return {
    alert: st.alert, hull: st.hull, shield: st.shield, guns, gunsUp: st.guns, gunsFitted: st.gunsFitted, shieldName: SHIELDS[profile.shield].name,
    housed: { ...run.hangar.housed }, out: { ...run.hangar.out },
    tier: sys.tier, tierName: TIERS[sys.tier].name, dev: run.dev, devNext: next, nextName: sys.tier < 3 ? TIERS[(sys.tier + 1) as Tier].name : null,
    power: step ? { supply: step.power.supply, demand: step.power.demand } : null, powerSource: profile.power.source,
    market: { resource: profile.market, open, prices, income: run.income },
    temple: { name: profile.temple.name, history: profile.temple.history, god: profile.god, boon: BOON_TEXT[profile.boon], works: step?.boon === profile.boon },
    meters: step?.meters ?? null, doctrine: profile.doctrine,
  };
}
export type StationSummary = ReturnType<typeof summary>;
