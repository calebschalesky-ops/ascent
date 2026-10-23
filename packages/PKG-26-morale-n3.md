# PKG-26-morale-n3
Label: PKG-26 · Kind / seat: build / Talos with Palamedes (read `<local>`,
`palamedes.md`) · Base: `claude/game` @ <launch tip> · Port: 5226 at `http://[::1]:5226/?skirmish&setup=europa-12v12-wings`
· Worktree `pkg-26`

Phase B package **N3**: morale and breaking. Phase B (`vision/visions/2026-10-21-phase-b-prompt.md`; scripts `vision/scripts/EXP-07..15`, `WORLD-03..06`; the code inventory and package split `vision/scripts/PHASE-B-INVENTORY.md`; Daedalus's rulings on the board, section "Phase B"). Phase A must not get worse: every Phase A WORLD check that passes at `--seeds 10` on your base still passes after (paste before and after); WORLD-02 c3/c4 and WORLD-01 c6 are parked with Caleb (For Caleb 13), so report their three seed blocks but they don't gate you.

Makes these pass: EXP-09 steps 1-4, 7, 8, 11 (inventory: missing/partial; 5, 6, 9, 10 exist and must keep passing);
WORLD-04 checks 1-11 (A3 for check 11; A8 for any number you tune: tune on seeds 1-60, judge on 61-90).

## Rulings you build on (Daedalus, board "Phase B")
- The enemy admiral is a **person** aboard the flagship, lost apart from it (VISION §7 counts two losses): captured
  with it, killed, or transferred; both losses drop morale, the admiral's at least as far as the flagship's.
- A **wing is a squadron** (NAVY §1 wings = BRIDGE §10 squadrons; assumed, on Caleb's list): build wings with their own
  morale on the setups' wing data (PKG-20 added `europa-12v12-wings` and others); B5 will put commodores on them later.
- Fanatics never strike (exists; keep).

## Do
1. Wings with morale (per ship and per wing, NAVY §1); one wing wavers before the fleet when it loses two ships.
2. A broken ship runs with a visible jump spool (engine glow building; Zeuxis tokens); mass lock pins it and the
   pinning captain reports it; pinned broken ships strike where the player can see it (lights change, guns silent).
3. Taking the flagship with the admiral aboard collapses the fleet: "Their admiral is our prisoner", ≥ 3 strike or flee
   within 30 s (WORLD-04 c1); the admiral's loss counts on its own (c3).
4. No early break: without flagship or admiral loss, a side breaks only after half its strength is gone (c4).
5. The end screen counts struck, fled, pinned-then-struck and captured apart, and names the cause.
6. A `decapitate` policy for WORLD-04 c10 (the plan written in the report before its first run, A3).
Files you own: new `src/battle/sim/morale/**`, `battle.ts` breakShip / side check / escape lines (inventory names
550-640; name them), `boarding/boarding.ts` capture lines that drop morale on flagship loss (343-346), `types.ts` /
`numbers.ts` / `summary.ts` / `checks.ts` / `policies.ts` registry lines (rule 9; WORLD-04 rows), the comms lines for
"pinned" and "admiral is our prisoner" in `sim/comms/lines.ts` (Kalliope's voice; add keys only), spool and strike
visuals in `src/battle/view/**` (new file + named lines), the end-screen counts, tests, `shots/pkg-26/**`.
Must not touch: `src/battle/sim/fighters/**` and the `pdChance` line (PKG-25), `policy-good.ts`, `policy-bad.ts`,
`admiral/**` logic beyond reading the new admiral status.
Flag: none (morale is core; Phase A checks guard it). Save: skirmish saves nothing.
Acceptance: tsc; `npx vitest run --maxWorkers=4`; lint `src/battle/sim/**`; build; smoke; WORLD-04 at `--seeds 30
--from 61` (held out) and `--from 1`; Phase A WORLD before/after; EXP-09 steps 1-4, 7, 11 played in the UI on
`europa-12v12-wings` (screenshots). Report `reports/PKG-26.md` with a numbers-changed table.
