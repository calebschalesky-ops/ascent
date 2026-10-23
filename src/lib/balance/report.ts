/**
 * The balance report: runs the simulator over the game's tables, checks each result against a stated band, and writes
 * the result as markdown. Seeded, so the same tables give the same report. `npx vitest run src/lib/balance` prints it.
 *
 * Bands are written here before the run and changed only with a reason in INTEGRATION-REPORT-<n>.md.
 */
import type { NationId } from '../nations';
import { NATIONS } from '../nations';
import { craftStats } from '../craftStats';
import type { ShipType } from '../shipTypes';
import { SHIP_TYPES } from '../shipTypes';
import type { WeaponId } from '../weapons';
import { WEAPONS } from '../weapons';
import type { BattleStats, HitTable, Mounts } from './battle';
import { ONE_MOUNT, battleMany, expectedDps, many } from './battle';
import type { EngageStats } from './engage';
import { DEFAULT_ENGAGE, DEG, engageMany } from './engage';
import { rng } from './rng';

export const BANDS = {
  mirror: [0.35, 0.65] as const, // win rate of side A in a mirror fight (also: no race's level-1 cruiser above 0.65)
  ttk: { fighter: [0.5, 3], cruiser: [1.5, 6], capital: [10, 45], destroyer: [4, 20] } as Record<ShipType, readonly [number, number]>, // seconds, player's best weapon, steady aim
  killRate: 0.9, // the player's best weapon kills within 60 s at least this often, every type
  loneCapitalVsFighters: 0.35, // a capital ship alone wins at most this often against six fighters
  escortedCapitalVsFighters: 0.65, // with two cruisers it wins at least this often
  raceSpread: 1.5,
  // typeOrder: for every race, a fighter dies faster than a cruiser and a cruiser faster than a capital ship (best weapon)
 // no race's ship of a type takes more than this times the median race's time to kill
  destroyerVsCruiser: 0.8, // DESTROYER.md: a destroyer beats a cruiser at least this often (its own guns, 3 turrets)
  destroyerVsCapital: 0.35, // … and beats a capital ship at most this often
  roleSplit: 1.5, // no weapon may be the best against every type by more than this factor
  usefulHit: 0.15, // a weapon hitting a type less often than this is flagged as useless against it
};

export interface Flag { band: string; detail: string; owner: string }
export interface Report { races: { nation: NationId; type: ShipType; laser: EngageStats; missile: EngageStats }[]; engage: Record<string, EngageStats[]>; hits: HitTable; battles: { mounts: string; rows: BattleStats[] }[]; sweep: { turrets: number; lone: number; escorted: number }[]; flags: Flag[]; markdown: string }

const AIMS: [string, number][] = [['steady 0.25°', 0.25 * DEG], ['normal 0.5°', 0.5 * DEG], ['rough 1°', 1 * DEG]];
/**
 * Four laser-and-missile turrets on a capital ship, one on everything else (the model has four turrets); the destroyer
 * has three (lib/destroyer.ts HULL guns, progression's three weapon slots).
 */
export const CAPITAL_TURRETS: Mounts = { capital: 4, cruiser: 1, fighter: 1, destroyer: 3 };

const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '—');
const pct = (x: number) => `${Math.round(x * 100)}%`;

export function balanceReport(seed = 1, runs = 200, fights = 400): Report {
  const r = rng(seed);
  const engage: Record<string, EngageStats[]> = {};
  for (const [label, aimError] of AIMS) {
    engage[label] = [];
    for (const t of SHIP_TYPES) for (const w of WEAPONS) engage[label].push(engageMany(t, w, runs, r, { ...DEFAULT_ENGAGE, aimError }));
  }
  const normal = engage['normal 0.5°'];
  const get = (t: ShipType, w: WeaponId) => normal.find((e) => e.type === t && e.weapon === w)!;
  const hits = Object.fromEntries(WEAPONS.map((w) => [w, Object.fromEntries(SHIP_TYPES.map((t) => [t, get(t, w).hitRate]))])) as HitTable;

  // Every hostile race's ship of each type, with its loadout's hit points and dodge, against the player at 0.5°.
  const races = NATIONS.filter((n) => n.id !== 'earth').flatMap((n) => SHIP_TYPES.map((type) => ({
    nation: n.id, type,
    laser: engageMany(type, 'laser', runs / 2, r, { ...DEFAULT_ENGAGE, nation: n.id }),
    missile: engageMany(type, 'missile', runs / 2, r, { ...DEFAULT_ENGAGE, nation: n.id }),
  })));

  const force: ShipType[] = ['capital', 'destroyer', 'cruiser', 'cruiser', 'fighter', 'fighter', 'fighter', 'fighter'];
  const battles = ([['one mount each', ONE_MOUNT], ['capital has 4 turrets', CAPITAL_TURRETS]] as [string, Mounts][]).map(([mounts, m]) => ({
    mounts,
    rows: [
      ...SHIP_TYPES.map((t) => battleMany(`${t} vs ${t}`, [t], [t], hits, fights, r, m)),
      battleMany('nation force vs nation force', force, force, hits, fights, r, m),
      battleMany('capital alone vs 6 fighters', ['capital'], many('fighter', 6), hits, fights, r, m),
      battleMany('capital + 2 cruisers vs 6 fighters', ['capital', 'cruiser', 'cruiser'], many('fighter', 6), hits, fights, r, m),
      battleMany('cruiser vs 3 fighters', ['cruiser'], many('fighter', 3), hits, fights, r, m),
      battleMany('capital vs 5 cruisers', ['capital'], many('cruiser', 5), hits, fights, r, m),
      battleMany('destroyer vs cruiser', ['destroyer'], ['cruiser'], hits, fights, r, m),
      battleMany('destroyer vs 2 cruisers', ['destroyer'], many('cruiser', 2), hits, fights, r, m),
      battleMany('destroyer vs 3 cruisers', ['destroyer'], many('cruiser', 3), hits, fights, r, m),
      battleMany('destroyer vs capital', ['destroyer'], ['capital'], hits, fights, r, m),
      battleMany('2 destroyers vs capital', many('destroyer', 2), ['capital'], hits, fights, r, m),
      battleMany('destroyer vs 4 fighters', ['destroyer'], many('fighter', 4), hits, fights, r, m),
    ],
  }));

  // How many mounts a capital ship needs for "beats many fighters only with escorts": the band's window.
  const sweep = [1, 2, 3, 4, 5].map((turrets) => {
    const m: Mounts = { capital: turrets, cruiser: 1, fighter: 1, destroyer: 3 };
    return {
      turrets,
      lone: battleMany('lone', ['capital'], many('fighter', 6), hits, fights, r, m).winA,
      escorted: battleMany('escorted', ['capital', 'cruiser', 'cruiser'], many('fighter', 6), hits, fights, r, m).winA,
    };
  });

  const flags: Flag[] = [];
  for (const t of SHIP_TYPES) {
    const best = WEAPONS.map((w) => get(t, w)).sort((a, b) => a.ttkMean - b.ttkMean)[0];
    const [lo, hi] = BANDS.ttk[t];
    if (best.ttkMean < lo || best.ttkMean > hi) flags.push({ band: 'ttk', detail: `${t}: best weapon (${best.weapon}) kills in ${f1(best.ttkMean)} s, band ${lo}–${hi} s`, owner: 'shipTypes.ts (hp) / weapons.ts (damage)' });
    if (best.killRate < BANDS.killRate) flags.push({ band: 'killRate', detail: `${t}: best weapon kills within 60 s in ${pct(best.killRate)} of runs`, owner: 'shipTypes.ts / weapons.ts' });
    for (const w of WEAPONS) {
      const e = get(t, w);
      if (e.hitRate < BANDS.usefulHit) flags.push({ band: 'usefulHit', detail: `${w} hits a ${t} ${pct(e.hitRate)} of shots at 60 units with 0.5° aim`, owner: w === 'missile' ? 'weapons.ts MISSILE / shipTypes.ts dodge' : 'shipTypes.ts hitRadius / weapons.ts LASER' });
    }
  }
  for (const t of SHIP_TYPES) {
    const rows = races.filter((x) => x.type === t).map((x) => ({ x, best: Math.min(x.laser.ttkMean, x.missile.ttkMean) }));
    const sorted = rows.map((y) => y.best).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    for (const y of rows) if (y.best > median * BANDS.raceSpread) flags.push({ band: 'raceSpread', detail: `${y.x.nation} ${t}: ${f1(y.best)} s to kill against a median of ${f1(median)} s (hp ${craftStats(y.x.nation, t).hp})`, owner: 'enemy-ai enemyArms.ts rollFit (shield by doctrine and level) / craftStats.ts' });
  }
  for (const n of new Set(races.map((x) => x.nation))) {
    const best = (t: ShipType) => { const x = races.find((y) => y.nation === n && y.type === t)!; return Math.min(x.laser.ttkMean, x.missile.ttkMean); };
    if (!(best('fighter') < best('cruiser') && best('cruiser') < best('capital'))) flags.push({ band: 'typeOrder', detail: `${n}: fighter ${f1(best('fighter'))} s, cruiser ${f1(best('cruiser'))} s, capital ${f1(best('capital'))} s to kill (fighter hp ${craftStats(n, 'fighter').hp} vs table 36)`, owner: 'enemy-ai enemyArms.ts CLASS fighter shieldMul and level shield tier / craftStats.ts' });
  }
  const ratio = SHIP_TYPES.map((t) => expectedDps('laser', t, hits) / Math.max(1e-9, expectedDps('missile', t, hits)));
  if (ratio.every((x) => x > BANDS.roleSplit)) flags.push({ band: 'roleSplit', detail: `laser out-damages the missile against every type (×${ratio.map((x) => x.toFixed(1)).join(', ×')})`, owner: 'weapons.ts' });
  if (ratio.every((x) => x < 1 / BANDS.roleSplit)) flags.push({ band: 'roleSplit', detail: `missile out-damages the laser against every type`, owner: 'weapons.ts' });
  for (const b of battles) for (const row of b.rows) {
    if (row.label.includes(' vs ') && row.label.split(' vs ')[0] === row.label.split(' vs ')[1] && (row.winA < BANDS.mirror[0] - 0.05 || row.winA > BANDS.mirror[1])) {
      flags.push({ band: 'mirror', detail: `${row.label} (${b.mounts}): side A wins ${pct(row.winA)}`, owner: 'battle.ts (symmetry bug)' });
    }
    if (b.mounts === 'capital has 4 turrets' && row.label === 'destroyer vs cruiser' && row.winA < BANDS.destroyerVsCruiser) flags.push({ band: 'destroyer', detail: `${row.label}: destroyer wins ${pct(row.winA)}, band ≥ ${pct(BANDS.destroyerVsCruiser)}`, owner: 'lib/destroyer.ts / shipTypes.ts destroyer row' });
    if (b.mounts === 'capital has 4 turrets' && row.label === 'destroyer vs capital' && row.winA > BANDS.destroyerVsCapital) flags.push({ band: 'destroyer', detail: `${row.label}: destroyer wins ${pct(row.winA)}, band ≤ ${pct(BANDS.destroyerVsCapital)}`, owner: 'lib/destroyer.ts / shipTypes.ts destroyer row' });
    if (row.label === 'capital alone vs 6 fighters' && row.winA > BANDS.loneCapitalVsFighters) flags.push({ band: 'escorts', detail: `${row.label} (${b.mounts}): capital wins ${pct(row.winA)}, band ≤ ${pct(BANDS.loneCapitalVsFighters)}`, owner: 'shipTypes.ts / enemy armament (arsenal, fleet-command)' });
    if (row.label === 'capital + 2 cruisers vs 6 fighters' && row.winA < BANDS.escortedCapitalVsFighters) flags.push({ band: 'escorts', detail: `${row.label} (${b.mounts}): capital side wins ${pct(row.winA)}, band ≥ ${pct(BANDS.escortedCapitalVsFighters)}`, owner: 'shipTypes.ts / enemy armament (arsenal, fleet-command)' });
  }

  const md: string[] = [];
  md.push(`Seed ${seed}; ${runs} engagements per cell; ${fights} fights per battle row. Target patrols a Mars-sized home; shooter parked 60 units out.`, '');
  for (const [label] of AIMS) {
    md.push(`**Player against one ship (type table only, no race loadout), aim ${label}**`, '', '| Type | Weapon | Kill rate (60 s) | TTK mean s | TTK p90 s | Hit rate | DPS | Dodged |', '|---|---|---|---|---|---|---|---|');
    for (const e of engage[label]) md.push(`| ${e.type} | ${e.weapon} | ${pct(e.killRate)} | ${f1(e.ttkMean)} | ${f1(e.ttkP90)} | ${pct(e.hitRate)} | ${f1(e.dps)} | ${e.weapon === 'missile' ? pct(e.dodgeRate) : '—'} |`);
    md.push('');
  }
  md.push('**Each race’s ships against the player** (race loadout hit points and dodge, as the game builds them; aim 0.5°)', '', '| Race | Type | HP | Dodge | Laser TTK s | Missile TTK s | Missile hit |', '|---|---|---|---|---|---|---|');
  for (const x of races) { const c = craftStats(x.nation, x.type); md.push(`| ${x.nation} | ${x.type} | ${c.hp} | ${pct(c.dodge)} | ${f1(x.laser.ttkMean)} | ${f1(x.missile.ttkMean)} | ${pct(x.missile.hitRate)} |`); }
  md.push('');
  for (const b of battles) {
    md.push(`**Fleet fights, ${b.mounts}** (hypothetical: enemies have no guns yet; every mount is the player's laser and missile at 0.5° aim)`, '', '| Fight | A wins | B wins | Both die | Mean length s |', '|---|---|---|---|---|');
    for (const row of b.rows) md.push(`| ${row.label} | ${pct(row.winA)} | ${pct(row.winB)} | ${pct(row.draw)} | ${f1(row.timeMean)} |`);
    md.push('');
  }
  md.push('**Capital-ship mounts sweep** (6 fighters; band: alone ≤ ' + pct(BANDS.loneCapitalVsFighters) + ', with 2 cruisers ≥ ' + pct(BANDS.escortedCapitalVsFighters) + ')', '', '| Capital mounts | Alone wins | With 2 cruisers wins | In band |', '|---|---|---|---|');
  for (const x of sweep) md.push(`| ${x.turrets} | ${pct(x.lone)} | ${pct(x.escorted)} | ${x.lone <= BANDS.loneCapitalVsFighters && x.escorted >= BANDS.escortedCapitalVsFighters ? 'yes' : 'no'} |`);
  md.push('');
  md.push('**Flags**', '');
  if (!flags.length) md.push('None.');
  for (const fl of flags) md.push(`- [${fl.band}] ${fl.detail} (owner: ${fl.owner})`);
  return { races, engage, hits, battles, sweep, flags, markdown: md.join('\n') };
}
