# PKG-06-comms-sim
Label: PKG-06 · Kind / seat: build / Talos for the model, Kalliope for the report lines (read
`<local>` and `kalliope.md`: write the lines as Kalliope would, in one house voice)
Base: claude/game @ <in the launch prompt> · Port: 5206 (headless) · Worktree `.claude/worktrees/pkg-06`

Makes these steps pass (sim side, proved by tests and the runner): EXP-02 steps 2, 3, 4, 5, 7, 8, 12 as model behaviour
(their on-screen half is the next wave's comms UI: report them wired-but-unproven); WORLD-01 check 5 (≥3 timeout
decisions, each with the deciding captain's trait, 10 of 10 seeds).
Scripts: `vision/scripts/EXP-02.md`, `WORLD-01.md`. Read first: `reports/PKG-02.md` (requests and decisions are events
in `battle.requests` and `battle.stats.decisions`; ~500 self-decisions per battle need filtering), `HOUSE-RULES.md`
rule 9.

Vision: `<repo>\BRIDGE-DESIGN.md` §1 (captains), §2 (staff: flag lieutenant filters), §3
(reports can be wrong: Candour and mood), §4 (the queue, answering, timeouts, asking, broadcast), §5 (orders: direct
in Phase A; intent and permission are later), §6 (pushback: protest and refusal out loud); VISION.md §7a "You command
your flagship's own crew" table, §8 "Command points pace orders".

## Build, in `src/battle/sim/comms/**` (new)
- **The queue model:** reports with level urgent / decision / status, from a captain (portrait key, name, ship, mood),
  text, 2–3 answers (each an `Order` or a set of them). Urgent jumps above decisions. Status lines fold into a flag
  lieutenant summary every N s. Exposes `queue(battle)` (ordered, what the UI draws) and `answerTop(battle, i)` (Q/E/R
  = i 0/1/2), `tabNext(battle)`, `ping(battle, ship)` (asking: a Candour-shaped answer).
- **What creates reports:** turn PKG-02's `battle.requests` and the right engine events into reports (withdraw, pursue,
  cover requests; shield side down; hull breach; a captain about to break; flagship threatened). Filter the ~500
  shield/turn self-decisions down to status. PKG-05 is adding boarding events now (`boardLaunch`, `boardDeflected`,
  `breach`, `boardFight`, `captured`, `repelled`, `scuttled`): map them to marine-commander reports when present, by
  event kind, without importing their files (read them off the log).
- **Timeouts:** a decision waits 4–12 s (shorter if urgent; longer for patient traits); unanswered, the captain decides
  by Judgement and trait (record `{t, ship, report, choice, why: trait/ability}` into `battle.stats.decisions` as a
  timeout decision). Ignoring a Grudge-holder costs a little loyalty; a Glory-hound takes the risky option.
- **Reports can be wrong:** low Candour or a bad mood skews a captain's own status report (e.g. understates damage);
  keep a per-captain report-accuracy record. Keep it simple and seeded.
- **The flagship's crew** as five officers with direct orders, each an `order()` kind (add them per rule 9):
  master of guns `gunsOn {target}` / `holdFire`; shields and engineering `shieldPower {split}` (exists) /
  `overloadGuns` / `feedEngines`; flag captain / helm `helm {maneuver}` (store the maneuver name only; M1 builds the
  flying, next wave) ; marine commander `launchPods {target}` (calls PKG-05's `board` order kind if present in
  `ORDER_KINDS`, else refuses out loud "no pods aboard"); fighter command `fighters {task}` (stored; fighters are a
  later package). Officers answer in person (a status report from the officer).
- **Command points:** a meter that refills over time; each order costs points (direct order to a ship more than an
  answer to a report; broadcast most); an order without points is refused with a reason. Numbers in
  `src/battle/sim/comms/numbers.ts`, first-pass.
- **Pushback:** a captain can protest or refuse a direct order by Judgement, Nerve, loyalty and trait, always out loud
  (a report). Nothing is refused silently (BRIDGE §12b rule 2).
- **Report lines** as data: `src/battle/sim/comms/lines.ts`, per report type × trait (11) × mood (5), at least 3
  variants each for the common types, picked by the seeded RNG. Greek/Roman/Byzantine register, short, no Red Rising
  names, reading level of a warship's comms ("Port side's open. Request we turn." not lore). Fill placeholders from
  data (ship names, sides, numbers).
- Policies for the runner: a `player-answers-first` policy (answers every decision with option 0 at once) so tests can
  compare against idle.

Files you own: `src/battle/sim/comms/**`, registry lines (rule 9) in the shared sim files.
Must not touch: `src/battle/view/**` (PKG-04), `src/battle/sim/boarding/**` (PKG-05), `src/battle/sim/admiral/**`
(PKG-07), existing lines of shared sim files beyond rule 9, everything outside `src/battle/sim/`.
Flag: none (sim only). Save shape: unchanged.
Decided for you: Q/E/R and Tab as in BRIDGE §4 (the UI binds them next wave); the queue is a pure function of battle
state plus the comms slice of state, so it replays deterministically.
Assumed, for Caleb to overrule: command-point costs; timeout lengths within 4–12 s; which officer answers.
You cannot prove: whether the captains sound like people (paste 20 sample lines in the report for Caleb).
Acceptance: `npx tsc -b`; `npx vitest run` (tests: urgent jumps the queue, status folds, answerTop applies the order
and logs it, timeout decides by trait with the trait recorded, Grudge loyalty cost, command points refuse with a
reason, each officer order changes the flagship's state, determinism still holds); lint on `src/battle/sim/**`;
`npm run build`; `npm run smoke`; `npm run sim -- --script WORLD-01 --seeds 10 --minutes 15 --policy idle` (check 5 now
built; 1, 2, 4, 6 still pass) and WORLD-02 idle (1, 2 still pass). Report `reports/PKG-06.md`.
