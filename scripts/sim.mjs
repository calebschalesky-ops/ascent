// The battle sim runner (PKG-02): `npm run sim -- --script WORLD-01 --seeds 10 --minutes 15 --policy idle [--variant v]`.
// Bundles src/battle/sim with the esbuild already in node_modules (no tsx or vite-node is installed, and nothing new is
// installed), runs one battle per seed in Node, writes one JSON summary per seed to vision/sims/<script>/, and prints
// the script's check table.
import { build } from 'esbuild';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function args(argv) {
  const out = { script: 'WORLD-01', seeds: 10, from: 1, minutes: 15, policy: 'idle', variant: null, write: true, roster: null, rosters: null, enemy: null, setup: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--script') { out.script = v; i++; }
    else if (k === '--seeds') { out.seeds = Number(v); i++; }
    // PKG-19: --from N starts at seed N (default 1), so a held-out block is one command: --from 61 --seeds 30.
    else if (k === '--from') { out.from = Number(v); i++; }
    else if (k === '--minutes') { out.minutes = Number(v); i++; }
    else if (k === '--policy') { out.policy = v; i++; }
    else if (k === '--variant') { out.variant = v; i++; }
    else if (k === '--no-write') out.write = false;
    // PKG-07: --roster N runs captain roster N instead of the setup's; --rosters 1-8 prints WORLD-02 check 2 per roster;
    // --enemy NAME overrides the enemy controller.
    else if (k === '--roster') { out.roster = Number(v); i++; }
    else if (k === '--rosters') { const [lo, hi] = v.split('-').map(Number); out.rosters = [lo, hi ?? lo]; i++; }
    else if (k === '--enemy') { out.enemy = v; i++; }
    // PKG-20: --setup ID picks a registered setup (default saturn-12v12); without --script it just runs the seeds.
    else if (k === '--setup') { out.setup = v; i++; }
    else throw new Error(`unknown argument ${k}`);
  }
  return out;
}

const opt = args(process.argv.slice(2));
const bundle = join(tmpdir(), `ascent-battle-sim-${process.pid}.mjs`);
await build({
  entryPoints: [join(root, 'src/battle/sim/index.ts')], bundle: true, platform: 'node', format: 'esm',
  outfile: bundle, logLevel: 'error',
});
const sim = await import(pathToFileURL(bundle).href);
rmSync(bundle, { force: true });

if (!sim.POLICIES[opt.policy]) {
  console.error(`unknown policy "${opt.policy}". Registered: ${sim.policyNames().join(', ')} `);
  process.exit(2);
}

// PKG-20: --setup with no --script runs the setup's seeds to their outcomes and writes nothing.
const setupOnly = opt.setup && !process.argv.includes('--script');
if (setupOnly) opt.write = false;
let setup;
try { setup = sim.setupById(opt.setup ?? sim.DEFAULT_SETUP); } catch (e) { console.error(e.message); process.exit(2); }
const outDir = join(root, 'vision', 'sims', opt.script);
if (opt.write) mkdirSync(outDir, { recursive: true });

function runOne(seed, variant, ctl = {}) {
  const player = ctl.player ?? opt.policy;
  const enemy = ctl.enemy ?? opt.enemy ?? undefined;
  const b = sim.startBattle(setup, seed, {
    maxMinutes: opt.minutes, variant, controllers: { player, ...(enemy ? { enemy } : {}) },
    ...(ctl.roster ?? opt.roster ? { rosterSeed: ctl.roster ?? opt.roster } : {}),
  });
  const t0 = performance.now();
  sim.run(b);
  const ms = performance.now() - t0;
  return { s: sim.summarise(b), ms, ai: sim.admiralReport(b, 'enemy') };
}

const reports = new Map();
function runSet(variant, tag, ctl = {}) {
  const out = [];
  const ais = [];
  for (let seed = opt.from; seed < opt.from + opt.seeds; seed++) {
    const { s, ms, ai } = runOne(seed, variant, ctl);
    out.push(s);
    ais.push(ai);
    const p = s.sides.player;
    const e = s.sides.enemy;
    console.log(`  ${tag} seed ${String(seed).padStart(2)}: ${String(s.outcome).padEnd(10)} ${String(s.durationS.toFixed(0)).padStart(4)} s  lost P ${p.shipsLost} (fled ${p.fled}, wd ${p.withdrawn}) E ${e.shipsLost} (fled ${e.fled}, wd ${e.withdrawn})  broken ${s.brokenShips}  timeouts ${s.timeoutDecisions.length}  self ${s.selfDecisions}  hash ${s.hash}  ${ms.toFixed(0)} ms wall`);
    if (opt.write) {
      const name = `seed-${String(seed).padStart(2, '0')}${variant ? `.${variant}` : ''}${tag.startsWith('repeat') ? '.repeat' : ''}${ctl.file ? `.${ctl.file}` : ''}.json`;
      // The full decision list lives in the battle; the file keeps the first 40 and the count (files stay small).
      const slim = { ...s, decisions: s.decisions.slice(0, 40), decisionsKept: Math.min(40, s.decisions.length), decisionsTotal: s.decisions.length };
      const admiral = ai.issued || ai.style ? { ...ai, opsLog: ai.opsLog.slice(0, 60) } : null;
      writeFileSync(join(outDir, name), JSON.stringify({ script: opt.script, policy: ctl.player ?? opt.policy, enemy: s.controllers.enemy, minutes: opt.minutes, wallMs: Math.round(ms), summary: slim, ...(admiral ? { admiral } : {}) }));
    }
  }
  reports.set(tag, ais);
  return out;
}

console.log(`${setupOnly ? 'setup run' : opt.script}: setup ${setup.name}, seeds ${opt.from}–${opt.from + opt.seeds - 1}, ${opt.minutes} min max, player policy ${opt.policy}, enemy ${opt.enemy ?? setup.enemy.controller}${opt.roster ? `, roster ${opt.roster}` : ''}${opt.variant ? `, variant ${opt.variant}` : ''}`);
let rows;
if (setupOnly) {
  // PKG-20: every seed must reach an outcome (victory, defeat or withdrawal; a timeout is counted apart).
  const xs = runSet(opt.variant, 'run');
  const tally = {};
  for (const s of xs) tally[s.outcome] = (tally[s.outcome] ?? 0) + 1;
  const ended = xs.filter((s) => s.outcome && s.outcome !== 'timeout').length;
  console.log('');
  console.log(`${setup.name}: ${xs.length} seeds, ${ended} decided, outcomes ${JSON.stringify(tally)}`);
  process.exit(xs.every((s) => s.outcome) ? 0 : 1);
} else if (opt.script === 'WORLD-01') {
  const base = runSet(null, 'base');
  const swapped = opt.variant ? runSet(opt.variant, opt.variant) : null;
  rows = sim.world01(base, swapped);
} else if (opt.script === 'WORLD-02' && opt.rosters) {
  // PKG-07 (amendment A3): check 2, idle player against the setup's enemy controller, on each captain roster.
  console.log('| Roster | Winner tally (seeds ' + opt.from + '–' + (opt.from + opt.seeds - 1) + ') | Same winner | Check 2 |');
  console.log('|---|---|---|---|');
  let held = 0;
  for (let r = opt.rosters[0]; r <= opt.rosters[1]; r++) {
    const xs = [];
    for (let seed = opt.from; seed < opt.from + opt.seeds; seed++) xs.push(runOne(seed, opt.variant, { player: 'idle', roster: r }).s);
    const row2 = sim.world02(xs, xs)[1];
    if (row2.status === 'pass') held++;
    console.log(`| ${r} | ${row2.got} | ${row2.got.split(' of ')[0]} of ${opt.seeds} | ${row2.status} |`);
  }
  console.log('');
  console.log(`rosters holding check 2: ${held} of ${opt.rosters[1] - opt.rosters[0] + 1}`);
  process.exit(0);
} else if (opt.script === 'WORLD-02') {
  const a = runSet(opt.variant, 'run');
  const b = runSet(opt.variant, 'repeat');
  if (opt.policy === 'idle') {
    // PKG-07: checks 3–7 need scripted-good and scripted-bad against the admiral, and the aggressive-admiral control.
    const good = runSet(opt.variant, 'good', { player: 'scripted-good', file: 'scripted-good' });
    const bad = runSet(opt.variant, 'bad', { player: 'scripted-bad', file: 'scripted-bad' });
    runSet(opt.variant, 'control', { player: 'idle', enemy: 'aggressive-admiral', file: 'aggressive-admiral' });
    rows = sim.world02(a, b, { good, bad, ai: reports.get('run'), control: reports.get('control'), boardOrder: sim.boardOrderExists() });
  } else rows = sim.world02(a, b);
} else {
  console.error(`no check table for ${opt.script}`);
  process.exit(2);
}
console.log('');
console.log(sim.formatTable(opt.script, rows, opt.seeds)); // PKG-16: adds the "Bar at 30 seeds" column
const failed = rows.filter((r) => r.status === 'FAIL');
console.log('');
console.log(failed.length ? `${opt.script}: ${failed.length} built check(s) FAILED` : `${opt.script}: every built check passed (${rows.filter((r) => r.status === 'pass').length} pass, ${rows.filter((r) => r.status === 'not built').length} not built, ${rows.filter((r) => r.status === 'not run').length} not run)`);
process.exit(failed.length ? 1 : 0);
