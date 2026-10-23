/**
 * The motivation plan's numbers (MOTIVATION.md), in one place. FIRST PASS, for Caleb to reshape.
 *
 * Two kinds of table live here:
 * - MIRRORS of other threads' numbers that are not merged yet (conquest's worlds and site kinds, planets' resolve,
 *   fleet-command's ranks). Each says where it comes from; on merge, swap the mirror for an import.
 * - PROPOSALS this plan makes: the XP curve, kill pay by time under fire, Earth's three tracks, the director's knobs,
 *   and the anti-stagnation thresholds. These are the spec other threads build to.
 *
 * Time is minutes of flight time throughout (conquest's clock: nothing runs while paused or closed).
 */
import type { NationId } from '../nations';
import type { ShipType } from '../shipTypes';

// ---------------------------------------------------------------------------------------------------------------
// Mirrors (swap for imports on merge)
// ---------------------------------------------------------------------------------------------------------------

/** Conquest's site kinds (CONQUEST.md 2.1): one-time XP, a one-time credit payout, income per minute while held. */
export type SiteKind = 'capital' | 'city' | 'fort' | 'shipyard' | 'foundry' | 'works' | 'battery' | 'section';
export const SITE: Record<SiteKind, { xp: number; credits: number; income: number }> = {
  capital: { xp: 400, credits: 150, income: 40 },
  city: { xp: 150, credits: 60, income: 20 },
  fort: { xp: 200, credits: 40, income: 5 },
  shipyard: { xp: 250, credits: 80, income: 12 },
  foundry: { xp: 150, credits: 50, income: 10 },
  works: { xp: 80, credits: 20, income: 9 }, // income 6 × richness; 1.5 is the mean richness across the seven worlds
  battery: { xp: 60, credits: 10, income: 0 },
  // PROPOSAL, not conquest's: a section of the world's god-armour station (god-armour's hardpoints, stations' systems),
  // taken like a site. Conquest was asked to model the station as sections; four per world until it says otherwise.
  section: { xp: 120, credits: 40, income: 8 },
};
export const STATION_SECTIONS = 4;

/**
 * Each world: its sites by kind (CONQUEST.md 2.3), the solo level-1 conquest time from conquest's simulator
 * (CONQUEST.md 9.1, enemies not shooting), and planets' resolve (PLANETS.md: how hard a conquered people resists).
 */
export interface WorldRow { sites: Record<Exclude<SiteKind, 'section'>, number>; conquerMin: number; resolve: number; heliumWorks: boolean; lifeline: boolean }
export const WORLDS: Record<NationId, WorldRow> = {
  earth: { sites: { capital: 1, city: 1, fort: 1, shipyard: 1, foundry: 1, works: 5, battery: 2 }, conquerMin: 14.5, resolve: 0.5, heliumWorks: false, lifeline: false },
  moon: { sites: { capital: 1, city: 1, fort: 1, shipyard: 1, foundry: 1, works: 4, battery: 1 }, conquerMin: 13.1, resolve: 1.5, heliumWorks: true, lifeline: true },
  mercury: { sites: { capital: 1, city: 1, fort: 2, shipyard: 1, foundry: 1, works: 3, battery: 2 }, conquerMin: 14.1, resolve: 1.0, heliumWorks: false, lifeline: true },
  venus: { sites: { capital: 1, city: 1, fort: 1, shipyard: 1, foundry: 1, works: 3, battery: 1 }, conquerMin: 12.4, resolve: 1.0, heliumWorks: false, lifeline: true },
  mars: { sites: { capital: 1, city: 1, fort: 2, shipyard: 1, foundry: 1, works: 4, battery: 1 }, conquerMin: 13.5, resolve: 1.0, heliumWorks: false, lifeline: true },
  jupiter: { sites: { capital: 1, city: 1, fort: 2, shipyard: 1, foundry: 1, works: 5, battery: 2 }, conquerMin: 27.9, resolve: 1.0, heliumWorks: true, lifeline: true },
  saturn: { sites: { capital: 1, city: 1, fort: 1, shipyard: 1, foundry: 1, works: 6, battery: 1 }, conquerMin: 23.4, resolve: 1.0, heliumWorks: true, lifeline: true },
};

/** Who each world imports from (CONQUEST.md 3.1). A world whose every supplier is yours is cut off. */
export const SUPPLIERS: Record<NationId, NationId[]> = {
  earth: ['moon', 'saturn'], moon: ['earth', 'saturn', 'venus'], mercury: ['saturn', 'venus', 'moon'],
  venus: ['mercury', 'jupiter', 'moon', 'saturn'], mars: ['mercury', 'moon', 'saturn'], jupiter: ['saturn'], saturn: ['jupiter'],
};

/** Conquest's control payout (CONQUEST.md 6) and the force every world keeps (shipTypes.ts FORCE). */
export const CONTROL_XP = 500;
export const SITE_ORDER: SiteKind[] = ['battery', 'section', 'foundry', 'shipyard', 'works', 'fort', 'city', 'capital'];
export const sitesOf = (w: NationId): Record<SiteKind, number> => ({ ...WORLDS[w].sites, section: STATION_SECTIONS });
export const siteCount = (w: NationId) => Object.values(sitesOf(w)).reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------------------------------------------

/**
 * Pilot level: total XP to reach each level (index 0 = level 1). Replaces 50 × L × (L − 1), which tops out at 4,500
 * while conquest pays at least 14,800 for the six worlds: level 10 would land after the second world, leaving four
 * worlds with no level to chase. This curve keeps the first three levels as fast as today and lands level 10 around
 * the fourth world turned (the simulated routes check it: between 45% and 85% of the run).
 */
export const XP_CURVE = [0, 100, 300, 650, 1200, 2200, 3800, 6500, 11000, 16000];
export const MAX_LEVEL = XP_CURVE.length;
/** After level 10: a Renown step every this much XP (Diablo III's paragon idea): +5 command points and a medal each. */
export const RENOWN_STEP = 2500;
export const renownOf = (xp: number) => Math.max(0, Math.floor((xp - XP_CURVE[XP_CURVE.length - 1]) / RENOWN_STEP));
export function levelOf(xp: number): number {
  let l = 1;
  while (l < MAX_LEVEL && xp >= XP_CURVE[l]) l++;
  return l;
}

/**
 * Kill pay by time under fire. Today a capital ship pays 14 XP a second of fighting and a fighter 2 (integration
 * report 1, P2): the safest target pays best. Paying a flat rate per second of the simulator's time to kill makes
 * every target worth the same per second, so the player picks targets for the fight, not the payout.
 */
export const XP_PER_COMBAT_SECOND = 10;
export const CREDITS_PER_XP = 0.6;
/** Ships a world rebuilds (levies, CONQUEST.md 7) pay this share. */
export const LEVY_PAY = 0.5;

/** Salvage: the variable layer on top of every kill's fixed pay. Rolled per kill. */
export const SALVAGE = [
  { kind: 'crate', chance: 0.25, credits: [15, 60] as const },
  { kind: 'part', chance: 0.06, credits: [120, 200] as const }, // a module part: the next purchase gets cheaper by this much
  { kind: 'relic', chance: 0.012, credits: [400, 600] as const }, // a named module, one tier above what is on sale
];

/** Earth's technology track: research projects at the Great Library, paid up front, finished on flight time. */
export interface TechTier { tier: number; credits: number; minutes: number; needs?: 'helium' | 'twoWorlds'; gives: string }
export const TECH: TechTier[] = [
  { tier: 1, credits: 0, minutes: 0, gives: 'Tier-1 modules (the start).' },
  { tier: 2, credits: 250, minutes: 6, gives: 'Tier-2 modules: plasma, swarm, mines, capacitor, heavy plating, chaff, attack drone.' },
  { tier: 3, credits: 700, minutes: 10, gives: 'Tier-3 modules; Mk II shields and reactor; drone-swarm racks.' },
  { tier: 4, credits: 1500, minutes: 15, needs: 'helium', gives: 'Torpedo; Mk III targeting; the capital ship\'s fusion drive.' },
  { tier: 5, credits: 3000, minutes: 20, needs: 'twoWorlds', gives: 'Mk III shields and reactor; boarding drills; drop pods.' },
  { tier: 6, credits: 5000, minutes: 20, gives: 'The Aegis of Gaia: Earth\'s god-armour wakes (home defence, +1 crisis turret ring).' },
];

/** What the player can buy, in the order a sensible pilot buys it (progression's ECONOMY prices), gated by tech tier. */
export const SHOPPING: { label: string; credits: number; tier: number; power: number }[] = [
  { label: 'Seeker missile', credits: 80, tier: 1, power: 0.04 },
  { label: 'Armour plating', credits: 80, tier: 1, power: 0.03 },
  { label: 'Targeting computer', credits: 100, tier: 1, power: 0.03 },
  { label: 'Decoy flares', credits: 90, tier: 1, power: 0.02 },
  { label: 'Railgun', credits: 110, tier: 1, power: 0.04 },
  { label: 'Repair drone', credits: 120, tier: 1, power: 0.03 },
  { label: 'Bay fighter', credits: 150, tier: 1, power: 0.04 },
  { label: 'Plasma bolt', credits: 220, tier: 2, power: 0.07 },
  { label: 'Capacitor shield', credits: 230, tier: 2, power: 0.06 },
  { label: 'Bay fighter', credits: 150, tier: 2, power: 0.05 },
  { label: 'Attack drone', credits: 300, tier: 2, power: 0.05 },
  { label: 'Beam laser', credits: 450, tier: 3, power: 0.08 },
  { label: 'Hardened shield', credits: 520, tier: 3, power: 0.07 },
  { label: 'Bay fighter', credits: 150, tier: 3, power: 0.05 },
  { label: 'Point-defence drone', credits: 480, tier: 3, power: 0.05 },
  { label: 'Torpedo', credits: 900, tier: 4, power: 0.09 },
  { label: 'Mk III targeting', credits: 1100, tier: 4, power: 0.05 },
  { label: 'Mk III shield', credits: 1600, tier: 5, power: 0.08 },
  { label: 'Mk III reactor', credits: 1400, tier: 5, power: 0.06 },
];

/**
 * Earth's Works: the home world's own development, the fourth ladder and the sink that is always open. Each project
 * is paid once, changes something the player can see at home (the god-armour of Gaia gains a plate, the yard a
 * slip), and adds a little power. Nothing gates them, so there is always something to save for.
 */
export const WORKS: { label: string; credits: number; power: number }[] = [
  { label: 'Charter Guard drill yard (home patrol +1 cruiser)', credits: 300, power: 0.02 },
  { label: 'Pharos Yard second slip (fighters 20% cheaper)', credits: 600, power: 0.02 },
  { label: 'Lagrange Guns Mk II (home batteries hit harder)', credits: 900, power: 0.02 },
  { label: 'The Great Library annex (research 15% faster)', credits: 1300, power: 0.02 },
  { label: 'The Exchange floor (home budget +15/min)', credits: 1800, power: 0.02 },
  { label: 'First plate of the Aegis (home station armour)', credits: 2500, power: 0.03 },
  { label: 'Pharos Yard dry dock (capital ships repair at home)', credits: 3200, power: 0.03 },
  { label: 'Temple of Gaia restored (+influence a minute)', credits: 4000, power: 0.02 },
  { label: 'Second plate of the Aegis', credits: 5000, power: 0.03 },
  { label: 'The Metropolis lights (the whole night side lit in your colours)', credits: 6500, power: 0.03 },
  { label: 'Third plate of the Aegis', credits: 8000, power: 0.03 },
  { label: 'Fourth plate of the Aegis', credits: 8000, power: 0.03 },
  { label: 'The Gaia Engine (the Aegis turns its guns outward)', credits: 8500, power: 0.03 },
  { label: 'Fifth plate of the Aegis', credits: 9000, power: 0.03 },
  { label: 'The Charter Hall (seats for the seven worlds, for the end)', credits: 9500, power: 0.03 },
];

/**
 * Holdings: rebuilding a world you have turned (PLANETS.md open question 2: build in cities you hold). Each world
 * has these four, in order; each lowers its unrest and raises its pay. The late game's sink, so credits from six
 * worlds always have somewhere to go that the player can see on the planet.
 */
export const HOLDINGS: { label: string; credits: number; unrest: number; income: number }[] = [
  { label: 'restore the temple', credits: 900, unrest: 0.1, income: 5 },
  { label: 'reopen the market', credits: 1600, unrest: 0.05, income: 15 },
  { label: 'rebuild the walls', credits: 2600, unrest: 0.1, income: 5 },
  { label: 'seat its council in the Charter Hall', credits: 4000, unrest: 0.15, income: 10 },
];

/** Earth's military track: fleet-command's ranks (FLEET-COMMAND.md 2), with the unlock rules this plan proposes. */
export interface Rank { rank: number; name: string; level: number; credits: number; tech: number; turned: number; helium: boolean; site: boolean; gives: string; power: number }
export const RANKS: Rank[] = [
  { rank: 0, name: 'Pilot', level: 1, credits: 0, tech: 1, turned: 0, helium: false, site: false, gives: 'Your race\'s cruiser.', power: 1 },
  { rank: 1, name: 'Flight lead', level: 2, credits: 0, tech: 1, turned: 0, helium: false, site: false, gives: 'The bay opens with a free fighter; two orders.', power: 1.1 },
  { rank: 2, name: 'Squadron leader', level: 4, credits: 0, tech: 2, turned: 0, helium: false, site: true, gives: 'Bay of four; a drone rack (16 swarm drones) can replace fighters.', power: 1.2 },
  { rank: 3, name: 'Wing commander', level: 5, credits: 1000, tech: 3, turned: 0, helium: false, site: true, gives: 'A destroyer escort from the home yard; infantry dropships in the cruiser bay.', power: 1.35 },
  { rank: 4, name: 'Captain', level: 7, credits: 0, tech: 4, turned: 1, helium: true, site: true, gives: 'The capital ship (mission "Take command"); full orders, the tactical view.', power: 1.6 },
  { rank: 5, name: 'Commodore', level: 8, credits: 3500, tech: 5, turned: 2, helium: true, site: true, gives: 'A second capital ship; drill boarders; detached missions.', power: 1.8 },
  { rank: 6, name: 'Admiral', level: 10, credits: 0, tech: 5, turned: 3, helium: true, site: true, gives: 'The armada: command points grow with every world turned; transfer flag.', power: 2 },
];

/** Earth's political track: standing, raised by what the player does and spent on diplomacy. */
export const STANDING = ['Outsider', 'Envoy', 'Broker', 'Hegemon', 'Archon', 'Metropolis restored'];
/** Influence (IP) costs and payouts. */
export const INFLUENCE = {
  start: 60, // the mother city's name still opens doors: Earth starts with this much (another home starts with 20)
  pact: 60, // trade pact: resource access, income, the world stops attacking
  vassal: 70, // demand vassalage of a weakened world (navy broken and production half gone, or cut off): this, plus
  vassalPerTurned: 25, // this for every world already turned (each demand harder than the last)
  alliance: 200, // a pact held `allianceAfter` min becomes an alliance: its navy fights beside you
  allianceAfter: 60,
  pacify: 50, // settle a rebellion without a fight (honour the temple, pay the priests)
  breakReckoning: 120, // peel one member out of the Reckoning
  perTurned: 50, // gained for every world turned, by any route
  allyPower: 0.15, // an ally's navy fights beside you: power × (1 + this) for each
  vassalPower: 0.03, // a vassal sends levies
  perPactMinute: 1.5,
  perVassalMinute: 1,
  perThreatRepelled: 10,
  perNemesis: 30,
  perSiteHeld: 0.15, // a minute, per held site: order is influence too
};
export const PACT_INCOME = 20; // credits a minute per trade pact
/** A convoy run: what one trade run between two pact worlds pays. */
export const CONVOY = { credits: 120, influence: 20, xp: 60 };
/** A freighter seized during a blockade. */
export const SEIZED = { credits: 80, xp: 40 };
export const VASSAL_TRIBUTE = 0.5; // share of a controlled world's income a vassal pays
export const HELD_ECONOMY = 0.7; // planets: a held world settles at 0.4–0.78 of conquest's income; the mean

/** The director: the solar system pushes back. Minutes. */
export const DIRECTOR = {
  relax: 3, // after a threat ends, no new threat for this long (L4D's relax)
  stallHold: 15, // no rung for this long: optional threats (rival, Reckoning raid, later feud raids, raid) wait
  calmMaxMid: 12, // dominant and nothing pushing back for this long → a raid (after the first world turns); under the rule's 15 so a fight in progress can finish
  calmMaxLate: 12, // the same once three worlds are turned (9 was tried: a third of the late game went on defence)
  dominant: 1.6, // power ÷ the next target's hardness above this counts as dominant
  counterAfterTurn: [8, 14] as const, // a relief fleet hits a newly turned world this long after
  reckoningAtHeld: 3, // worlds held (2 turned plus your capital) before your neighbours turn on you: the Reckoning (00-system.md 2.4)
  reckoningMobilise: 1.25, // their yards build this much faster while it stands
  reckoningRaidEvery: 25,
  firstRaid: 0.6, // the first feud raid, in minutes from the first undock: two fighters inside the minute (FEUDS.md 5)
  feudRaidEvery: 6, // then your blood enemy raids you again this long after the last raid ended (first pass, for Palamedes)
  nemesisEvery: 35, // the rival commander returns about this often once he has escaped you
  nemesisEscapes: 2, // he gets away this many times before the duel that ends him; his successor rises after
  rebellionUnrest: 0.5,
  rebellionCooldown: 40,
  lastAllianceAtHeld: 5, // the Last Alliance marches when this many worlds are held (4 turned plus your capital)
  marchWarning: 12, // the countdown the player sees before the Grand Armada arrives (00-system.md 3.3; XCOM's Avatar clock)
};

/** Anti-stagnation rules (MOTIVATION.md 6). Each is a number a playtest or the simulator can check. */
export const RULES = {
  // A next rung within N min, by stage: [worlds turned below, N]. Written first as clock bands (10 min to the first
  // hour, 25 to hour 4, 45 after); keyed to the stage after the runs, because the routes reach the late game at
  // different times and the late game is defined by worlds, not minutes (MOTIVATION.md 8.3).
  // The first band was 10; the political route's first blockade and ultimatum leave 12-13 min between rungs, so 13.
  nextGoal: [[1, 13], [4, 25], [Infinity, 45]] as [number, number][],
  rewardGap: [[30, 4], [180, 8], [Infinity, 12]] as [number, number][], // [until minute, max minutes between meaningful rewards]
  threatWhenDominant: 15, // dominant and idle: a threat within this many minutes
  relax: 3,
  purchaseHorizon: 10, // from minute 5, the next useful purchase is at most this many minutes of income away
  variety: { window: 60, kinds: 2 }, // in every 60-minute window, at least two kinds of activity
  levelTenShare: [0.45, 0.85] as const, // level 10 lands between these shares of the run
  // A whole game, start to the last world turned. Written as 6-14 before the first run; changed to 4-10 after it
  // (MOTIVATION.md 8.3): conquest's own band is 8-30 min a world solo, so six worlds with enemy fire, threats and
  // travel land at 4-6 h, and a flight game should not be stretched to a 4X's length to meet a guess.
  runHours: [4, 10] as const,
};

/** Time costs the simulator charges besides fighting (minutes). */
export const ASSUME = {
  enemyFire: 2, // conquest's times assume enemies do not shoot; enemy AI makes every fight this much longer
  searchSeconds: 8, // conquest's: finding each ship
  travel: 1, // autopilot between worlds plus docking (planet scale measured the whole ten-stop tour at 99 s)
  shop: 1, // a visit to buy
  diplomacy: 2, // docking at the world's station and the talk (one dialogue choice)
  convoy: 4, // the economic route's trade run between pact worlds (conquest open question 7: hauling)
  blockade: 18, // planets: a besieged economy falls 34-74 points in 30 min; about 18 to push it under 40 for a demand
  blockadeStep: 3, // the blockade is played in steps; each seizes a freighter
  ultimatum: 12, // after a vassal demand the world holds out this long under blockade before it swears fealty
  skirmish: 1.2, // the first hour: one patrol ship at a time, approach included
  lastAllianceWaves: 3, // the Grand Armada comes in waves of threatMinutes.lastAlliance each, each paid as it breaks
  enemyTech: 0.15, // every world turned, the free worlds' fleets field better fits (enemy-ai's levels 1-5): hardness x (1 + this x turned)
  armadaCap: 0.6, // bought armada ships add at most this much power (more ships cost command points, not dominance)
  threatMinutes: { counter: 6, raid: 5, feudRaid: 5, reckoningRaid: 7, nemesis: 4, rebellion: 6, lastAlliance: 6 } as Record<string, number>,
};

export const SHIP_TYPES_PAID: ShipType[] = ['capital', 'cruiser', 'fighter'];
