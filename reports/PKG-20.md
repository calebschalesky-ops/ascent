# PKG-20 report: setups S2 (Talos, with Kalliope for names)

Branch `claude/pkg-20`, launched at ad81038. Phase B package S2: every start state EXP-07..15 and WORLD-03..06 name now
exists as data, opens on screen at its own body, and runs headless to an outcome.

## What I measured first

The start states the scripts name (`grep -n "Start state"` EXP-07..15, setups named in WORLD-03..06):

| Script | Setup it names | Built as |
|---|---|---|
| EXP-07 | `europa-12v11` (no Fanatic in the enemy line) | `europa-12v11` + fixture `no-fanatic` |
| EXP-08 s1-7 | `titan-haze-12v11` (enemy Saturn house, one Fanatic cruiser) | `titan-haze-12v11` + `one-fanatic` |
| EXP-08 s8-13 | `phobos-13v12` (Mars house, Mars style) | `phobos-13v12` (`styles.enemy = 'mars'`) |
| EXP-09, WORLD-04 | `europa-12v12-wings` (three wings, one Fanatic) | `europa-12v12-wings` + `one-fanatic`, three `wings` |
| EXP-10 | Saturn's rings + `rosters/candour-mix` | `saturn-12v12+candour-mix` |
| EXP-11 | Europa + `rosters/pushback-mix` | `europa-12v12+pushback-mix` |
| EXP-12 | `saturn-16v16-reinforced` (6 by jump at 3:00) | `saturn-16v16-reinforced`, `reinforcements` at 180 s |
| EXP-13 | `titan-14v12-defector` (Ambitious, loyalty 52, courted) | `titan-14v12-defector` + `ambitious-52`, `courted` |
| EXP-14, EXP-15 | `europa-12v12` | `europa-12v12` |
| EXP-15, WORLD-06 | `phobos-12v12`, `moon-12v12`, `mercury-12v12` | the three, `styles.enemy` mars / moon / mercury |
| WORLD-03 | `ref-03`, `ref-05`, `ref-08`, `ref-10`, `ref-11`, `ref-22`, `ref-24`, `ref-27`, `ref-28` | all nine (the eight-row check counts nine rows in the table) |
| WORLD-04, WORLD-06 | `saturn-12v12` | unchanged |

Nothing else was built. 22 ids in total (`setupIds()`), the default included.

## What I changed

- `src/battle/sim/setups/index.ts` (new): the registry. `SETUPS`, `setupById(id)` (`<setup>` or `<setup>+<roster>`;
  unknown ids throw, naming the registered ones), `startBattle(setup, seed, opts)` = `createBattle` plus the setup's
  roster fixture and wings. A setup with neither (so `saturn-12v12`) goes straight to `createBattle`: same battle.
- `setups/europa.ts`, `titan.ts`, `phobos.ts`, `moon.ts`, `mercury.ts`, `saturn.ts` (new): the 19 new setups, data only.
- `setups/fleets.ts` (new): the houses and ship names, and `MIX`, the fleet mix by size (6, 8, 10, 11, 12, 13, 14, 16),
  marked FIRST-PASS for Palamedes. 12 is saturn-12v12's line exactly.
- `setups/rosters/index.ts` (new): seven fixtures, `candour-mix`, `pushback-mix`, `no-fanatic`, `one-fanatic`,
  `ambitious-52`, `glory-hound`, `by-the-book`. A pin names a ship by class and place in class, so one fixture fits any
  setup.
- `setups/apply.ts` (new): fixture and wings application. **Fair-roster rule kept:** a pinned captain is copied whole to
  the other side's ship of the same class and place, banned traits are banned on both sides, the unpinned captains are
  evened again by PKG-13's `fairRosters`, then morale and mood are recomputed. Draws only from a stream of the battle's
  roster seed, never the battle dice.
- `setups/setups.test.ts` (new): 16 tests (registry = the scripts' list, default unchanged by hash, every setup builds,
  no Red Rising names, determinism, wings, reinforcement/convoy/courted data, each fixture's captains, fair totals and
  traits per class on rosters 1-8 for every fixture setup, every setup runs headless).
- `src/battle/sim/types.ts` (rule 9: fields and new types only): `BattleSetup` gains `body`, `place`, `roster`, `wings`,
  `reinforcements`, `convoy`, `courted`, `styles`, `needs`; new `BodyId`, `WingSetup`, `ReinforcementSetup`.
- `src/battle/sim/index.ts`: three export lines (the registry and fixtures).
- `scripts/sim.mjs`: `--setup <id>` only. With `--script` the script's checks run on that setup; without it the seeds run
  to their outcomes, a tally prints, nothing is written. `runOne` calls `startBattle(setup, ...)` (for the default,
  identical to the old `createBattle(SATURN_12V12, ...)`). PKG-19's `--from` is not on the branch yet: keep both.
- `src/battle/view/Skirmish.tsx`: the lines are `const SETUP = setupById(...get('setup'))` (after `END_DELAY`), the
  import line, `createSimFeed(START_SEED, SETUP)`, `createBattleView(host, rig, bodyOf(SETUP))`, and the header
  `{placeOf(SETUP)} · {clock}` (was the literal "Saturn's rings").
- `src/battle/view/scene.ts`: `createBattleView(..., body = 'saturn')`; the body line
  `const planet = new THREE.Mesh(..., body === 'saturn' ? surfaceMaterial('saturn', u) : bodyMaterial(body, u))`;
  `rings.visible = hasRings(body)`; two import lines.
- `src/battle/view/body.ts` (new): the body's material from the voyage game's own shaders: `surfaceMaterial` for Mars
  (near Phobos), the Moon and Mercury; `moonletMaterial` with moonScene.ts's Europa and Titan styles and colours. No new
  painted art; nothing for `GEMINI-QUEUE.md`.
- Outside my file list, named here: `src/battle/view/simFeed.ts` (4 lines: `createSimFeed(seed0, setup = SATURN_12V12)`
  and its two `createBattle` calls now `startBattle(setup, ...)`; without it the setup param could not reach the
  battle) and `src/battle/view/f6.test.ts` (one `EXEMPT` entry for `body.ts`, the planet colours; the file's own rule
  is "add a file here only when it draws art").
- `shots/pkg-20/`: `shoot.mjs` (headless Chrome over CDP: every setup at 1280x720 and 375x812, 20 s stepped by the
  probe, header and console read), `shots.json`, 44 screenshots (JPEG, 4.3 MB).

## Script steps

| Step | State |
|---|---|
| 1. registry: `?skirmish&setup=<id>`, default `saturn-12v12`, runner `--setup <id>` | pass |
| 2. named setups as data (body, positions, fleets, wings, reinforcement waves); Europa + more bodies; rosters as fixtures, fair rule kept | pass (bodies: Saturn, Europa, Titan, Phobos/Mars, Moon, Mercury) |
| 2a. reinforcement waves fired | not built (data only, as the package says: a later package fires them) |
| 3. the scene draws the setup's body (voyage planet art, no new art) | pass, 44 of 44 screenshots |
| 4. names from Greek, Roman, Byzantine history and LORE, none from Red Rising, every new name listed | pass (list below) |
| each setup headless 3 seeds to an outcome | pass, 21 of 21 (see evidence; two have one timeout among their three) |
| each setup opens with its body at 1280 and 375 | pass, 22 ids x 2 widths, zero console errors, no horizontal scroll |
| saturn-12v12 WORLD-01/02 at 10 seeds identical before and after | pass, every seed hash identical, output identical apart from wall time |

Flag: none (the default setup is unchanged). Save: skirmish saves nothing; no save version change.

## New names (Kalliope's call, for Caleb to overrule)

- Houses: House of Callisto (Jupiter, from LORE), House of Miltiades (Saturn; the Philaidai), House of Cincinnatus
  (Mars), House of the Pythia (the Moon; LORE's College of the Pythia), House of Agis (Mercury; Sparta's Agiad kings).
- Kleisthenes adds: Ostrakon, Boule, Demos, Kraken. Ganymede adds: Sarissa, Phalanx, Hypaspist, Hetairos.
- Callisto: First Crown, Basilissa, Agema, Argyraspid, Pezhetairos, Seleukos, Antigonos, Lysimachos, Kassandros,
  Ptolemaios, Philetairos, Attalos, Eumenes, Perdikkas, Krateros, Antipatros.
- Miltiades: Marathon, Kimon, Chersonese, Eurymedon, Lemnos, Skyros, Thasos, Eion, Elpinike, Hegesipyle, Oloros, Lakiadai.
- Cincinnatus: Aratrum, Fasces, Lictor, Aquila, Pilum, Gladius, Testudo, Castra, Tribune, Consul, Dictator, Arsia,
  Quirinus, Algidus.
- Pythia: Omphalos, Tripod, Laurel, Kastalia, Parnassos, Tholos, Amphiktyon, Sibyl, Theoros, Korykion, Mantis, Pleistos.
- Agis: Ephor, Agoge, Hoplite, Thermopylae, Leonidas, Lykourgos, Eurotas, Taygetos, Gerousia, Xiphos, Lambda, Amyklai.
- Tankers (convoy data): Amphora, Pithos, Hydria, Kylix.

## Still broken or not built

- Reinforcements, convoys (tankers), courted houses, and `needs` (depot, comms array, defection, fighter wings, cover in
  the ring ice) are data no system reads yet. `ref-03/05/08` fight without the convoy; `ref-10` has a bigger fleet
  standing in for the depot; `ref-24` has no array to lose.
- Mars, Moon and Mercury enemies fight under `admiral-jupiter`; `styles.enemy` names the style AI2 should plug in.
- Outcomes with the idle player are almost all `withdrawal`; `titan-14v12-defector` and `ref-22` each time out once in
  three seeds (a timeout is an outcome; the tally prints it apart).
- Mercury's gold glow and Saturn's amber are close hues at a glance (mercury-12v12-1280.jpg). Zeuxis's call.
- The first full vitest run of the session, under heavy parallel load, failed 27 tests in 15 files on timeouts
  (652 s); the same command on an idle machine 3 h later failed only `f6.test.ts` (my `body.ts` colours), fixed by the
  EXEMPT line above. Both runs are in the evidence.

## Requests

- **simFeed.ts owner:** keep the `setup` parameter and `startBattle` calls (4 lines, named above), or take them into
  your package.
- **moonScene.ts owner:** export its `LOOK` table so `body.ts` can import Europa's and Titan's colours instead of
  copying them; then the `f6.test.ts` exemption for `body.ts` can go.
- **AI2:** read `setup.styles.enemy` to pick the admiral style. **Fleet/convoy/reinforcement packages:** read
  `reinforcements`, `convoy`, `courted` by `b.setup` through `setupById`.
- **Palamedes:** `fleets.ts MIX` and the wing offsets are first-pass.

## Assumed, for Caleb to overrule

- Mirroring fixed captains to the other side is how "fair rosters" survives a fixed roster (so a Fanatic enemy cruiser
  means a Fanatic player cruiser too).
- In `titan-haze-12v11` the player is Jupiter's House of Ganymede: the enemy is a Saturn house and two Saturn lines
  would look identical.
- Near Phobos the backdrop is Mars. The Moon's defenders are a Pythia house (the Selenitai rarely fight for themselves).
- EXP-10's honest captain is By-the-book. The raiders "hidden in the ice" start 4 km away instead of 9.
- The `<setup>+<roster>` id form, so one `--setup` flag covers EXP-10 and EXP-11.
- Screenshots were taken in headless Chrome over CDP (as smoke.mjs does), not the in-app pane.

## Evidence

(pasted below, newest last)

### `git log --first-parent -3` on claude/game after the merge
```
06ea20b Merge PKG-20: setup registry, 19 named setups at six bodies, roster fixtures, body drawn per setup
f5605de Daedalus: TRC-05 56/65, wave-05 tagged, hard-stop cleanup
54e185a Merge TRC-05: launch-tip re-score, eight traces, 56/65 (was 39/65), one regression WORLD-02 c3 at 90 seeds
```

### `git diff --stat 06ea20b^1 06ea20b` (the merge)
```
 scripts/sim.mjs                                 |  24 +-
 shots/pkg-20/shoot.mjs                          |  73 +++
 shots/pkg-20/shots.json                         | 574 ++++++++++++++++++++++++
 src/battle/sim/index.ts                         |   3 +
 src/battle/sim/setups/apply.ts                  |  80 ++++
 src/battle/sim/setups/europa.ts                 |  40 ++
 src/battle/sim/setups/fleets.ts                 |  96 ++++
 src/battle/sim/setups/index.ts                  |  76 ++++
 src/battle/sim/setups/mercury.ts                |  19 +
 src/battle/sim/setups/moon.ts                   |  21 +
 src/battle/sim/setups/phobos.ts                 |  33 ++
 src/battle/sim/setups/rosters/index.ts          |  78 ++++
 src/battle/sim/setups/saturn.ts                 |  39 ++
 src/battle/sim/setups/setups.test.ts            | 175 ++++++++
 src/battle/sim/setups/titan.ts                  |  33 ++
 src/battle/sim/types.ts                         |  24 +
 src/battle/view/Skirmish.tsx                    |   9 +-
 src/battle/view/body.ts                         |  28 ++
 src/battle/view/f6.test.ts                      |   1 +
 src/battle/view/scene.ts                        |   7 +-
 src/battle/view/simFeed.ts                      |  10 +-
 65 files changed, 1429 insertions(+), 14 deletions(-)
 (plus 44 screenshots under shots/pkg-20/)
```

### Gate, in the game worktree, on 06ea20b
```
2026-10-22T11:39:49-07:00
06ea20b Merge PKG-20: setup registry, 19 named setups at six bodies, roster fixtures, body drawn per setup
## tsc
tsc exit 0
## vitest
 Test Files  69 passed (69)
      Tests  890 passed (890)
   Start at  11:40:27
   Duration  71.26s (tests 89%, import 8%, transform 2%)
## build
  dist/sw.js
  dist/workbox-9c191d2f.js
build exit 0
## smoke
[40.3s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":21,"shots":639,"movedBySide":[11,10],"drawCalls":169} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[45.1s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (45.1s)
2026-10-22T11:43:48-07:00
```

### Acceptance on the merged branch (177370a), before the merge

The full vitest run took 32,420 s: the machine slept through it, and 8 tests in 7 files timed out. Per A9 those 7 files were re-run alone at `--maxWorkers=1` (second block): all pass. The gate run above, on an awake machine, passed 890 of 890.
```
2026-10-22T02:25:48-07:00
177370a Merge branch 'claude/game' into claude/pkg-20
## tsc
tsc exit 0
## vitest
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 8 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/battle/view/view.test.ts > sim feed (the real engine through model.ts) > ends with an outcome, a reason and each side's tally from summarise()
 FAIL  src/lib/balance/balance.test.ts > balance simulator > writes the report
 FAIL  src/lib/balance/conquest.test.ts > conquest balance > runs every world against a level-1 pilot and meets the bands
 FAIL  src/lib/planets/planets.test.ts > the headless run (bands written before it ran: PLANETS.md 3.1) > prints the tables (PLANETS.md 3.2)
 FAIL  src/battle/sim/admiral/admiral.test.ts > AI admiral (PKG-07) > PKG-13: telegraphs a push on at least 8 of seeds 1-10, and never launches boarders unseen
 FAIL  src/battle/sim/admiral/admiral.test.ts > AI admiral (PKG-07) > the difficulty knob changes the admiral: an easy admiral makes mistakes
 FAIL  src/battle/sim/maneuvers/maneuvers.test.ts > maneuvers: broadside pass joins the run without a detour (PKG-18) > never swings out past the run line or runs back along it by more than a turning radius
 FAIL  src/battle/sim/setups/setups.test.ts > setup registry (PKG-20) > uses no Red Rising name for a house or ship
 Test Files  7 failed | 59 passed (66)
      Tests  8 failed | 870 passed (878)
   Start at  02:28:07
   Duration  32419.66s (import 66%, tests 34%)
## lint (my files)
eslint-mine exit 0
## lint (all)
   955:17  error  React Hook "useTarget" is called in function "clickDown" that is neither a React function component nor a custom React Hook function. React component names must start with an uppercase letter. React Hook names must start with the word "use"  react-hooks/rules-of-hooks
  1897:20  error  React Hook "useTarget" is called in function "frame" that is neither a React function component nor a custom React Hook function. React component names must start with an uppercase letter. React Hook names must start with the word "use"      react-hooks/rules-of-hooks
  55:7   error  'p' is never reassigned. Use 'const' instead                           prefer-const
  82:33  error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  93:55  error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  91:7  error  't' is assigned a value but never used  @typescript-eslint/no-unused-vars
  326:22  error  'ry' is never reassigned. Use 'const' instead  prefer-const
✖ 18 problems (7 errors, 11 warnings)
  1 error and 1 warning potentially fixable with the `--fix` option.
## build
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
build exit 0
## smoke
> ascent-flight@0.0.0 smoke
> node scripts/smoke.mjs
[BABEL] Note: The code generator has deoptimised the styling of <temp> as it exceeds the max of 500KB.
[45.4s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":21,"shots":639,"movedBySide":[11,10],"drawCalls":169} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[51.0s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (51.0s)
## setups, 3 seeds each
exit 0 | europa-12v11: 3 seeds, 3 decided, outcomes {"withdrawal":3}
exit 0 | europa-12v12: 3 seeds, 3 decided, outcomes {"withdrawal":3}
exit 0 | europa-12v12-wings: 3 seeds, 3 decided, outcomes {"withdrawal":3}
exit 0 | ref-11: 3 seeds, 3 decided, outcomes {"withdrawal":3}
exit 0 | titan-haze-12v11: 3 seeds, 3 decided, outcomes {"withdrawal":3}
exit 0 | titan-14v12-defector: 3 seeds, 2 decided, outcomes {"timeout":1,"withdrawal":1,"victory":1}
exit 0 | ref-22: 3 seeds, 2 decided, outcomes {"timeout":1,"withdrawal":1,"victory":1}
exit 0 | phobos-13v12: 3 seeds, 3 decided, outcomes {"withdrawal":3}
exit 0 | phobos-12v12: 3 seeds, 3 decided, outcomes {"withdrawal":3}
exit 0 | ref-10: 3 seeds, 3 decided, outcomes {"withdrawal":3}
exit 0 | ref-27: 3 seeds, 3 decided, outcomes {"withdrawal":3}
exit 0 | moon-12v12: 3 seeds, 3 decided, outcomes {"withdrawal":3}
exit 0 | ref-24: 3 seeds, 3 decided, outcomes {"withdrawal":3}
exit 0 | mercury-12v12: 3 seeds, 3 decided, outcomes {"withdrawal":3}
exit 0 | ref-28: 3 seeds, 3 decided, outcomes {"withdrawal":3}
exit 0 | saturn-16v16-reinforced: 3 seeds, 3 decided, outcomes {"withdrawal":3}
exit 0 | ref-03: 3 seeds, 3 decided, outcomes {"victory":3}
exit 0 | ref-05: 3 seeds, 3 decided, outcomes {"victory":3}
exit 0 | ref-08: 3 seeds, 3 decided, outcomes {"victory":3}
exit 0 | saturn-12v12+candour-mix: 3 seeds, 3 decided, outcomes {"withdrawal":3}
exit 0 | europa-12v12+pushback-mix: 3 seeds, 3 decided, outcomes {"withdrawal":3}
## saturn-12v12 WORLD-01/02 at 10 seeds, before vs after
w01 exit 0
w02 exit 0
w01: 10 seed hashes identical
w01: output identical apart from wall time
WORLD-01: every built check passed (5 pass, 1 not built, 1 not run)
w02: 51 seed hashes identical
w02: output identical apart from wall time
WORLD-02: every built check passed (7 pass, 0 not built, 0 not run)
2026-10-22T11:36:24-07:00
```
```
$ npx vitest run <the 7 files> --maxWorkers=1   (2026-10-22T11:36:53 to 11:39:39)
 Test Files  7 passed (7)
      Tests  92 passed (92)
   Duration  158.67s
```

### Earlier, on the branch before the merge: the load run and the f6 finding
```
2026-10-21T21:00:00-07:00
## tsc
tsc exit 0
## vitest
 Test Files  15 failed | 54 passed (69)
      Tests  27 failed | 863 passed (890)
   Start at  21:05:53
   Duration  652.07s (tests 83%, transform 11%, import 6%)

    Isolate  69 workers spawned · ~3.37s startup each (spawn + environment, per file)
             at least ~54.71s faster with isolate: false — reuses workers across files instead of one per file

...
      Tests  1 failed | 889 passed (890)
 FAIL  src/battle/view/f6.test.ts > F6: the battle view uses the shared tokens > no raw colour or typeface in src/battle/view/** outside the exempt art files
 Test Files  1 failed | 68 passed (69)
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
```

Screenshots: `shots/pkg-20/<setup>-1280.jpg` and `-375.jpg` for all 22 ids (a `+` in an id is `_` in the file name); `shots/pkg-20/shots.json` holds each one's header text, side tallies, scroll width and console errors (none).
