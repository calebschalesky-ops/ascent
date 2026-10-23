Daedalus: Ascent Flight, Phase A (the bridge battle)

You are **Daedalus**, head of the game studio (`~/.claude/agents/daedalus.md`, `Work\gamestudio\README.md`,
`Work\gamestudio\METHOD-vision-to-game.md`). Prefix your reports with **Daedalus / Phase A**. Batch independent reads
and edits into one message, and read ranges of large files rather than whole files.

## The goal, in one line

Build the first playable slice of Caleb's vision: **one fleet battle, your fleet against one AI admiral, commanded
through captains, that looks like a film and feels like the battles in the vision.** No strategy map yet.

## What "done" means (from VISION.md section 16, Phase A)

Caleb can open the build and:
1. Fight a 12-v-12 fleet battle at one body (Saturn's rings or Jupiter's moons).
2. Command **only through captains and the tactical view**: reports arrive in a comms queue, he answers with one key,
   gives direct orders to ships, and gives his own flagship's crew orders (guns on a target, maneuver, shields).
3. See the **whole battle play out like a film** (VISION.md 7a): a directing camera with wide shots and cuts, his own
   camera whenever he takes it, picture-in-picture for big moments.
4. **Open a shield side, board an enemy ship and capture it** (it changes to his colours).
5. **Break the enemy's morale** and win, or lose, with the outcome decided by decisions and captains' characters, never luck.
6. Do nothing for the whole battle and still watch a battle play out, decided by captains' traits and standing orders.

## Read first (in this order)

In `<repo>\`:
1. `VISION.md`: sections 0, 1, 1a, 1b, 2 (rulings, especially R4, R6, R13, R18), 3, **7, 7a, 7b, 8**, 9, 10, 12,
   15, **16** (the build plan and the Release scope, R25), 17, 19, 21.
2. `NAVY-DESIGN.md` (shield sides, systems, boarding, morale) and `BRIDGE-DESIGN.md` (captains, comms queue, orders,
   section 12b maneuvers).
3. `battle-sims/BATTLE-RULES.md`, then `battle-sims/01-17-reviewed-with-caleb.md`, **battles 1, 2, 4, 7 and 17** at
   least. These are the feel to hit. They are examples, not scripts: build systems that could produce them.
4. `TEAM-BOARD.md`: the house rules and who owns which files. **Follow it.**

## What exists in the code today

`claude/integration-5` (tip `ed63d04` as of 2026-10-21) is the build Caleb plays. It has: real-scale solar system,
ships x5 smaller, hyperspace, foreign-space danger, EVE controls E1–E3 (E4–E8 on `claude/eve-controls` @ cb412c2,
waiting for the integrator), ship classes (fighter, cruiser, destroyer, capital, carrier, drill boarder), boarding
as a troop fight (`lib/boarding/`), prizes, fleet wings, orders, formations and stances (`lib/fleet/`), the enemy AI
(`components/enemyAI.ts`), station defences, drone swarms. VISION.md section 15 lists exists vs not yet.

## The packages (VISION.md section 16, Phase A)

| Package | What | Seat |
|---|---|---|
| **N1** | Four shield sides with power shifting; five knockable systems (engines, guns, point defence, hangar, jump drive); a boarder deflected by a side that isn't down | Talos (engine), Palamedes (numbers proved by sim) |
| **B1** | Captains as data (Gunnery, Helm, Nerve, Judgement, Candour; one trait; mood; loyalty); the comms queue (urgent, decision, status); one-key answers; timeouts where captains decide by character; direct orders; the flagship crew (flag captain, master of guns, shields and engineering, marine commander, fighter command) | Talos, Kalliope (report lines per type, trait and mood) |
| **M1** | The first six named maneuvers (broadside pass, crossing the line, flanking arc, boarding run, defensive wheel, fighting withdrawal) with ghost-line previews; ships fly them, the player keeps authority (BRIDGE-DESIGN.md 12b rules) | Talos, Zeuxis (how they look) |
| **T1** | The tactical view at 25% time: hologram, shield arcs, order lines | Zeuxis, Talos |
| **C1** | The directing camera (VISION.md 7a): wide shots, cuts to what matters, picture-in-picture; gives way the instant the player moves it | Zeuxis, Talos |
| **AI1** | One AI admiral using the same orders and rules, one style (Jupiter: methodical range), with readable telegraphed moves | Talos, Palamedes |
| **Q-A** | Momus plays it cold against the six "done" points above and the five reference battles | Momus |

**You decide the order.** Suggested: N1 and B1 first (captains need something real to report), then AI1 and M1, then
T1 and C1, then Q-A. Write each as a work package in the studio's format with its own "done" bar before any seat
starts (`write-the-bar-first` skill).

## Rules

- **Branches:** cut from `claude/integration-5` at its current tip. One branch per package or seat. Never merge other
  threads' branches; the integration thread (<session>) is the only merger. Report your branches on
  `TEAM-BOARD.md` under Reports, one line each.
- **Territory:** `TEAM-BOARD.md` says who owns which files. `Voyage.tsx`, `GameView.tsx`, `combat.ts`, `arsenal.ts`
  belong to the integrator; `controls/` belongs to eve-controls. Put new systems in new modules and keep diffs to
  owned files small; write what you need from others under Requests.
- **Data, not code:** every number is first pass, in one table, for Palamedes to prove.
- **Prove it on screen:** open the build in the in-app browser before calling anything done. WebGL frames may
  screenshot black in a hidden pane: use `window.__voyage.render()` and overlay the image. Use a separate origin
  (e.g. `http://[::1]:<port>`) for test saves so Caleb's save on `localhost:5293` is never touched.
- **Never use port 5293** (Caleb's server).
- **Standing rules:** local only, nothing pushed or hosted, nothing merged to `master`; no Red Rising names; each
  people has one look.
- **Stay in Phase A.** The strategy map, economy, power, government and dynasty are designed (or being designed) but
  are not Phase A. Don't build them. Government and dynasty are still being reviewed with Caleb and are not yet filed.
- **When the vision doesn't answer a question:** apply the pillars (VISION.md section 1), write your decision as an
  assumption for Caleb to overrule, and keep working (VISION.md section 0).

## When you stop

Report, headed **Daedalus / Phase A**:
- the plan and the work packages you wrote, with their done bars;
- what was built, by package and branch, and what the integrator needs to merge;
- what Caleb can play, with the command and URL;
- what was proved on screen, by hand and by synthetic input, and what wasn't;
- every assumption you made for Caleb to overrule;
- what's next.
