# PKG-02-battle-core
Label: PKG-02 (session title prefix, branch `claude/pkg-02`, report heading)
Kind / seat: build / Talos, with Palamedes's discipline on numbers (read `<local>`
and skim `palamedes.md`; their fence paths are for gamestudio, yours are below)
Base: claude/game @ <measured at dispatch, in the launch prompt>
Port: 5202 (you may not need a browser). Worktree: `<repo>`

Makes these steps pass: WORLD-01 checks 1, 2, 4, 6; WORLD-02 checks 1, 2. Lays the data EXP-05 step 1–2 and EXP-06
steps 1–4, 6 need (marked wired-but-unproven until the view exists).
Scripts: `vision/scripts/WORLD-01.md`, `WORLD-02.md`, `EXP-05.md`, `EXP-06.md` in the game worktree.

Why: VISION.md §15 "Does not exist yet": "Shield sides; ship systems; crew vs marines; morale and breaking"; "Captains
as characters". Phase A is "a skirmish mode: your fleet against one AI admiral at one body" (§16). Nothing headless
exists to run a battle, so neither the world scripts nor "never luck" can be checked.

Vision (read these sections by absolute path, `<repo>\`):
- `NAVY-DESIGN.md` §1 (four things to lose), §2 (weapons), decision 4 (morale ends battles).
- `BRIDGE-DESIGN.md` §1 (captains: five abilities 1–10, traits, loyalty, mood), §4 "Timeouts" (captains decide by
  Judgement and traits).
- `VISION.md` §7, §8, §1 pillar 8 (captains generated), §16 Phase A.
- `battle-sims/01-17-reviewed-with-caleb.md` battles 1 and 2 (lines 19–139): the feel to hit. Examples, not scripts.

## What to build: a headless, deterministic battle engine in `src/battle/sim/`
- **One seeded RNG** (`rng.ts`), the only randomness in `src/battle/sim/**`. Fixed timestep `step(battle, dt)`.
  `createBattle(setup, seed)` returns plain serialisable state (JSON round-trips).
- **Ships:** class (from `lib/shipTypes.ts`: read-only import is fine if it imports nothing renderer-side; check),
  side, position/velocity/heading in a battle-local frame (metres; the battle sits at Saturn's rings, ring plane = XZ),
  turn and acceleration limits by class and captain Helm.
- **N1 shields:** four sides (fore, aft, port, starboard), a power budget the ship's shields-and-engineering officer
  can shift between them (`setShieldPower(ship, split)`), regen. A hit lands on the side facing the shooter. A side at
  zero is open: gunfire reaches hull and systems.
- **N1 systems:** engines, guns, point defence, hangar, jump drive; each has health and knocks out at zero with an
  effect (engines: no thrust; guns: no fire; PD: no missile/boarder defence; hangar: no launches; jump drive: cannot
  flee by jumping). Hull at zero = wreck (no capture).
- **Crew and marines:** two numbers per ship; hull hits kill a little crew. (Boarding itself is the next package; give
  it a clean entry: a function stub `beginBoarding` is NOT yours, but keep `crew`/`marines`/`openSides()` public.)
- **Gunnery:** railguns long range (strip shields), plus the class's other guns as `lib/shipTypes.ts`/`munitions.ts`
  imply. Hit chance and damage from range, the target's facing, and the captain's Gunnery. No hidden dice: every
  random draw goes through the seeded RNG and its inputs are logged in the event log.
- **Captains as data** (`captains.ts`): Gunnery, Helm, Nerve, Judgement, Candour 1–10; one trait from BRIDGE §1's list;
  mood (fast) and loyalty (slow); generated from the seed with Greek/Roman/Byzantine names (no Red Rising names; see
  `LORE.md`). Abilities change the sim: Gunnery → accuracy, Helm → turn/accel, Nerve → break threshold.
- **Standing orders and the captain's own decisions:** with no player input every ship does something sensible by its
  captain's Judgement and trait (engage nearest, hold the line, protect the flagship, pick a weak side). Each
  decision a captain takes on their own is an event `{t, ship, decision, why: trait/ability}`. This is what makes
  WORLD-01 work. (The comms queue that shows these is PKG-later; just emit the events.)
- **Morale:** 0–100 per ship and per side. Falls with losses, the flagship lost, being outnumbered; low Nerve breaks
  sooner. A broken ship flees (jumps if its jump drive works and it is not mass-locked) or strikes its colours.
  Losing half the fleet or the flagship breaks a side. Battle outcome: victory / defeat / withdrawal, with a reason.
- **An order API** both the player and the later AI admiral will use: `order(battle, shipId, {kind, target?, ...})`
  for at least `attack`, `focusSide`, `holdPosition`, `followFlagship`, `withdraw`, `shieldPower`. One entry point;
  later packages add kinds. Every order is logged.
- **The setup:** `setups/saturn-12v12.ts`: player = a Saturn house, enemy = a Jupiter house; a credible mix (e.g. 1
  capital flagship, 2 destroyers, 4 cruisers, 1 carrier, 4 escorts per side; your call, write it as data).
- **Numbers:** every tunable in one table `src/battle/sim/numbers.ts`, each marked first-pass.
- **Event log and summary:** `battle.log` (capped) and `summarise(battle)` → ships lost/broken/struck per side,
  damage dealt, timeoutDecisions/self-decisions with traits, outcome, a state hash.

## The runner and checks
- `npm run sim -- --script WORLD-01 --seeds 10 --minutes 15 --policy idle` runs in Node (use `npx vite-node` or `tsx`
  if present in node_modules; check `ls node_modules/.bin`; do not install anything), writes one JSON per seed to
  `vision/sims/WORLD-01/`, and prints each check of that script with pass/fail and the seed count. Policies: `idle`
  now; leave a policy registry so `scripted-good`/`scripted-bad` slot in. Swapped-trait variant for WORLD-01 check 6:
  `--variant swap-nerve-judgement`.
- `package.json`: add `"test": "vitest run"` and `"sim": "<runner>"` (append-only lines).
- **Boundary:** an ESLint `no-restricted-imports` block for `src/battle/sim/**` forbidding `three`, `react`,
  `react-dom`, `src/components/**`; prove it by a planted import failing lint (then remove the plant).
- Tests in `src/battle/sim/*.test.ts`: determinism (same seed twice → identical state hash after 15 min), JSON
  round-trip, each shield side and each system knockout, morale break by Nerve, flagship-lost collapse.

Files you own: `src/battle/sim/**`, `vision/sims/WORLD-01/**`, `vision/sims/WORLD-02/**`, `scripts/sim*.mjs|ts`, the
two `package.json` script lines, the one ESLint block in `eslint.config.js`.
Files you must not touch: everything else, in particular `src/battle/view/**`, `src/App.tsx`, `src/flags.ts`,
`src/dev/**` (PKG-03 owns those, running now), and `Voyage.tsx`, `GameView.tsx`, `combat.ts`, `controls/**`,
`Shipyard.tsx`, `munitions.ts`, `progression/**` (PKG-01 and a live session).
Flag: none needed (nothing reaches the player until the view wires it; PKG-03 owns the `skirmish` flag).
Save shape: unchanged (the battle is not saved in Phase A).
Bench: n/a (headless). Report how long a 15-minute 12v12 battle takes to simulate in Node.
Decided for you: battle-local coordinates in metres, ring plane XZ; fixed step 1/30 s; the sim never reads wall time.
Assumed, for Caleb to overrule: the fleet mix; trait list as BRIDGE §1; a broken ship prefers jumping to striking
unless its jump drive is out or it is pinned.
You cannot prove: whether a battle "feels slow and heavy, then sudden" (report the time series of total morale per
side for seed 1 so Daedalus can look).

Acceptance commands: `npx tsc -b`; `npx vitest run` (all prior tests still pass; record counts); `npm run lint` on
`src/battle/sim/**` clean and the planted-import proof; `npm run sim -- --script WORLD-01 --seeds 10 --minutes 15
--policy idle` and `... --variant swap-nerve-judgement`; `npm run sim -- --script WORLD-02 --seeds 10 --minutes 15
--policy idle` (checks 1–2). Paste the printed check tables. Checks you could not reach (3, 5, 7 of WORLD-01; 3–7 of
WORLD-02) are rows marked not built, not omitted.
Report: `reports/PKG-02.md`, shape in `HOUSE-RULES.md`.
