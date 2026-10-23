# PKG-25-fighters-f1
Label: PKG-25 · Kind / seat: build / Talos with Palamedes for numbers (read `<local>`,
`palamedes.md`) · Base: `claude/game` @ <launch tip> · Port: 5225 at `http://[::1]:5225/?skirmish` · Worktree `pkg-25`

Phase B package **F1**: fighters as sim entities. Phase B (`vision/visions/2026-10-21-phase-b-prompt.md`; scripts `vision/scripts/EXP-07..15`, `WORLD-03..06`; the code inventory and package split `vision/scripts/PHASE-B-INVENTORY.md`; Daedalus's rulings on the board, section "Phase B"). Phase A must not get worse: every Phase A WORLD check that passes at `--seeds 10` on your base still passes after (paste before and after); WORLD-02 c3/c4 and WORLD-01 c6 are parked with Caleb (For Caleb 13), so report their three seed blocks but they don't gate you.

Makes these pass: Phase A EXP-02 step 10 (fighter command "Escort / Screen / Hunt" flies real wings: TRC-05 found
"fighter command answers screen and no fighters exist to fly it"); Phase B EXP-14 step 2 (screen with fighters) in the
sim; the boarding-escort and pods-en-route rows the inventory lists for fighters. EXP-12 s9 (courier) stays for B5.

## Do
1. Fighter wings as entities in the sim: carried by the hulls VISION §7 / NAVY §2 give them, launched, flown, lost,
   recovered; numbers in one table (first pass). Seeded draws only for gunnery-like spread (Daedalus ruling: "never
   luck" draws only for gunnery and noise).
2. The fighter-command orders already stored (`Order.task`: escort, screen, hunt) fly: escort stays with a ship and
   thins incoming pods; screen sits between a ship and a threat; hunt goes after enemy wings and pods.
3. Pods en route can be lost to point defence and enemy fighters (the `pdChance` line in `boarding/boarding.ts`, name it).
4. The view draws wings at the hull scale rules PKG-15 set (Zeuxis tokens; small, readable), in normal and tactical.
5. The AI admiral may order its own fighters with the player's order set only (WORLD-02 c5 must still pass).
Files you own: new `src/battle/sim/fighters/**`, `types.ts` / `battle.ts` / `orders.ts` / `numbers.ts` registry lines
(rule 9), the `pdChance` line in `boarding/boarding.ts`, the fighter-order lines in `admiral/**` (name them), fighter
drawing in `src/battle/view/**` (new file + named lines in `scene.ts`), tests, `shots/pkg-25/**`.
Must not touch: `src/battle/sim/morale/**`, `battle.ts` break/escape lines and `boarding.ts` capture lines (PKG-26),
`policy-*.ts`, `checks.ts` beyond a new row.
Flag: `fighters` in `src/flags.ts`, on only when your steps pass. Save: skirmish saves nothing.
Acceptance: tsc; `npx vitest run --maxWorkers=4`; lint `src/battle/sim/**`; build; smoke; bench budget (PKG-17 base
144 draw calls, +15%); Phase A WORLD before/after; EXP-02 s10 played in the UI (screenshot of a screen flown); a sim
table: pods lost en route with and without an escort wing, 30 seeds. Report `reports/PKG-25.md`.
