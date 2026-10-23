# PKG-05-boarding
Label: PKG-05 · Kind / seat: build / Talos, numbers by Palamedes's rules (read `<local>`, `palamedes.md`)
Base: claude/game @ <in the launch prompt> · Port: 5205 (headless mostly) · Worktree `.claude/worktrees/pkg-05`

Makes these steps pass (sim side, proved by tests and the runner): EXP-05 steps 3, 4, 5, 6, 7, 8, 9 as sim behaviour
(their on-screen half is wired-but-unproven until the comms UI and the view show them); EXP-06 step 5 (mass lock);
WORLD-01 check 3 (a boarding attempt by either side with nobody ordering it, 8 of 10 seeds).
Scripts: `vision/scripts/EXP-05.md`, `EXP-06.md`, `WORLD-01.md`. Read first: `reports/PKG-02.md` ("Requests: Boarding
package") and `HOUSE-RULES.md` rule 9 (shared sim files are registries).

Vision: `<repo>\NAVY-DESIGN.md` §3 (all six steps), §1 crew/marines row;
`BRIDGE-DESIGN.md` §7 (boarding through the marine commander's eyes: emit the events those reports need); VISION.md
§7 (prize crews, mass lock). Existing code you may import read-only: `src/lib/boarding/troops.ts` (Lanchester).

## Build, in `src/battle/sim/boarding/**` (new)
- Boarding craft as sim entities launched from a ship with a working hangar (carrier, capital): they fly to the
  target, cross point defence (`pdChance()`: losses en route are marines lost), and **are deflected by a shield side
  that is not down** (logged `deflected`). Through an open side: a 2.5 s breach that costs a little hull, then the
  fight inside: attacker marines vs defender marines + armed crew, by Lanchester weighted by quality (captain traits;
  Veteran +; leave a `ledByAdmiral` quality multiplier of 1.5 in numbers, unused in Phase A).
- While boarded, the defender pulls crew off guns: its gunnery drops (a multiplier in numbers).
- **Reinforce or repel:** further boarders can join a fight in progress. Pull-back ends it.
- **Outcome:** captured → the ship strikes and **flips `side` to the captor**, status active, `prize: true`, and fights
  with a prize crew (reduced crew and gunnery multiplier). Repelled → attacker marines lost. **Scuttle:** a losing
  Fanatic captain may blow the reactor (wreck, kills the marines aboard).
- Destroyed (wrecked) ships count for less than captured ones in `summarise()` (a `captured` count per side and a
  `prizeValue` field).
- **Mass lock:** a ship within a set range of an enemy capital or destroyer cannot jump (`canJump()` respects it).
  Broken ships that are mass-locked try to run on engines, and strike if pinned (PKG-02's rule).
- **Who boards when no one orders it:** captains with a hangar and the Judgement to see an open side launch on their
  own (a self-decision event with its trait/ability reason). The enemy stand-in doctrine may board too.
- Orders: add `'board'` (`{kind:'board', target, side?}`) and `'pullBack'` to `ORDER_KINDS` and `order()`.
- Events for the comms package (PKG-06 is building the queue now; just emit): `boardLaunch`, `boardDeflected`,
  `boardLost` (n), `breach`, `boardFight` (every few s: marines each side), `captured`, `repelled`, `scuttled`.
- Stats: increment `battle.stats.boardingAttempts`.
- Numbers: in `src/battle/sim/boarding/numbers.ts`, first-pass (pods per launch, marines per pod, PD kill chance
  scaling, breach time 2.5 s, crew-off-guns multiplier, prize crew multiplier, mass-lock range, scuttle chance).

Files you own: `src/battle/sim/boarding/**`, registry lines (rule 9) in the shared sim files, new tests
`src/battle/sim/boarding/*.test.ts`, `vision/sims/WORLD-01/**` re-run output.
Must not touch: `src/battle/view/**` (PKG-04), `src/battle/sim/comms/**` (PKG-06), `src/battle/sim/admiral/**`
(PKG-07), existing lines of shared sim files beyond rule 9, everything outside `src/battle/sim/`.
Flag: none (sim only). Save shape: unchanged.
Decided for you: one craft type ("boarding pod", from the drill-boarder idea) for Phase A; fighters escorting are a
later package (leave an `escorts` field).
Assumed, for Caleb to overrule: prize crew strength; mass-lock range; Fanatic scuttle.
You cannot prove: whether boarding feels like the decisive action.
Acceptance: `npx tsc -b`; `npx vitest run` (tests for each of: deflected by a closed side, lost to PD, breach, fight
won → side flips and prize, repelled, reinforced, scuttle, mass lock blocks jump, determinism still holds); lint on
`src/battle/sim/**`; `npm run build`; `npm run smoke`; `npm run sim -- --script WORLD-01 --seeds 10 --minutes 15
--policy idle` and the swap variant (checks 1, 2, 4, 6 must still pass; check 3 now built); `npm run sim -- --script
WORLD-02 --seeds 10 --minutes 15 --policy idle` (1, 2 must still pass). Paste the tables. Report `reports/PKG-05.md`.
