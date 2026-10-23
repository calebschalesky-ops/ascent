# PKG-07-ai-admiral
Label: PKG-07 · Kind / seat: build / Talos, numbers proved by sim as Palamedes would (read
`<local>`, `palamedes.md`)
Base: claude/game @ <in the launch prompt> · Port: 5207 (headless) · Worktree `.claude/worktrees/pkg-07`

Makes these steps pass: WORLD-02 checks 3, 4, 5, 6, 7, and keeps 1 and 2 passing with the real admiral (rule below).
Scripts: `vision/scripts/WORLD-02.md`. Read first: `reports/PKG-02.md` ("No AI admiral", "Requests: AI admiral
package", the roster note), `HOUSE-RULES.md` rule 9.

Vision: VISION.md §9 (every AI house runs the player's rules; three layers; Jupiter: methodical range; readable,
telegraphed moves; no cheating on vision or reaction time). Absolute path `<repo>\VISION.md`.

## Build, in `src/battle/sim/admiral/**` (new)
- **The operations layer**, every ~10 s of battle time: what to break, where to attack, when to commit boarders. It
  acts **only** through `order()` with the player's order kinds, and reads only what its own side's sensors know
  (whatever the sim exposes as the player's view of the enemy; if nothing separates them yet, read only positions,
  statuses and hits seen, never enemy shield values or morale, and say so).
- **One style, Jupiter: methodical range.** Keep the line at railgun range, focus one side of one ship at a time,
  withdraw a ship before it breaks, board only when a side is open and the escort lane is clear.
- **Readable, telegraphed boarding push:** fighters/escorts forward and capitals turning ≥5 s before its boarders
  launch (log `telegraph` events with timestamps). PKG-05 is adding the `board` order now; if `board` is in
  `ORDER_KINDS` when you merge, use it; otherwise leave the push wired and report check 6 as wired-but-unproven.
- **Difficulty knob** (numbers): reaction delay and mistake rate; Phase A uses one default.
- **Policies for the runner** (in your files, registered per rule 9): `scripted-good` and `scripted-bad` exactly as
  WORLD-02 defines them; an `aggressive-admiral` control (Mars-style: closes the range) for check 7. Replace
  `doctrine-concentrate` as `SATURN_12V12.enemy.controller` with your admiral (that one line in the setup is yours).
- **WORLD-02 check 2 across rosters** (Daedalus's rule for this wave, amendment A3): with your admiral, measure check 2
  on captain rosters 1–8 and report each. The bar is **6 of 8 rosters** stable, and the setup's roster is not chosen
  after seeing its result: keep `rosterSeed: 1` whatever it shows. If fewer than 6 of 8 hold, report which numbers make
  the battle a knife-edge; do not tune to pass.
- Add WORLD-02 checks 3–7 to `checks.ts` (rule 9 rows) and the runner.

Files you own: `src/battle/sim/admiral/**`, the `controller` line of `src/battle/sim/setups/saturn-12v12.ts`, registry
lines (rule 9), `vision/sims/WORLD-02/**`.
Must not touch: `src/battle/view/**` (PKG-04), `src/battle/sim/boarding/**` (PKG-05), `src/battle/sim/comms/**`
(PKG-06), existing lines of shared sim files beyond rule 9, everything outside `src/battle/sim/`.
Flag: none. Save shape: unchanged.
Decided for you: the admiral is a controller on the side's slot, the same slot a player policy uses.
Assumed, for Caleb to overrule: what "methodical range" means as numbers.
You cannot prove: whether it feels methodical (paste the order log of seed 1's first 3 minutes, condensed).
Acceptance: `npx tsc -b`; `npx vitest run`; lint on `src/battle/sim/**`; `npm run build`; `npm run smoke`; `npm run sim
-- --script WORLD-02 --seeds 10 --minutes 15` with each policy the checks need, printing checks 1–7; WORLD-01 idle and
swap still pass their built checks; the roster 1–8 table. Report `reports/PKG-07.md`.
