# PKG-14-bridge-fixes
Label: PKG-14 · Kind / seat: build / Talos with Kalliope's pen (read `<local>`,
`kalliope.md`) · Base: claude/game @ <launch prompt> · Port: 5214 at `http://[::1]:5214/` · Worktree `pkg-14`

Makes these steps pass: EXP-02 step 8 (a shield split he orders holds); EXP-05 step 6 through the queue (a marine
commander decision answered by Q/E/R), step 5 seen (the boarded enemy's fire visibly drops, or comms says so), steps 8
and 9 walked; EXP-02 step 10 with pods at their flagship. Scripts `vision/scripts/EXP-02.md`, `EXP-05.md`.
Read first: `reports/PKG-09.md` "Requests", `reports/PKG-08.md` requests 1 and 5, `reports/PKG-06.md` (lines),
`reports/PKG-05.md`.

## Do
1. **The order holds (EXP-02 s8):** while the flagship's engineering has a standing `shieldPower` order, the flag
   captain does not re-trim; the order stands until he changes it or the officer reports it can't hold (out loud).
   Same rule for any ship with a standing player shield order. (The trim logic in `captains.ts`: name the function.)
2. **Marine commander's decision report (EXP-05 s6):** while his marines fight inside an enemy ship, a decision report
   offers Reinforce (`board` that target) / Pull back (`pullBack`) / Carry on, so Q/E/R reach it; times out by the
   marine commander's Judgement.
3. **Boarding cleanup (PKG-08 request 1):** remove `captureSideCheck()`; a capture's morale shock uses the same
   per-strength shock as `shipOut()`; delete `MORALE.sideBreakLosses` once nothing reads it (PKG-13 is removing the
   admiral's read in parallel: if it still exists when you merge, leave the constant and say so).
4. **Pods at their flagship (ruling, Daedalus 2026-10-21):** VISION.md §7a's flagship-crew table gives the marine
   commander "Send the pods at their flagship". NAVY-DESIGN.md §3 says only the admiral leading in person may board the
   enemy flagship. VISION.md is the vision document and outranks the companion doc (method step 4), so in Phase A the
   marine commander may launch pods at the enemy flagship; the conflict is on Caleb's list to overrule. Every refusal
   gives its true reason (out of range, no pods, hangar down, side closed), never "the marines are not ready".
5. **Lines (Kalliope):** the `captured` line reads as a win when his side captures and a loss when it loses one; the
   flag lieutenant's fold never repeats a line and reads like a person ("Eleven reports, Admiral. Three ships trimming
   shields, six retargeting." not "Status, 34 lines"); surname variety: no surname more than twice in one fleet;
   house names that read as names, not placeholders (today "A Titan house (Saturn)" and "House of Ganymede (Jupiter)"):
   pick from `<repo>\LORE.md` and Greek/Roman/Byzantine history, no Red Rising names, and
   put the world in the HUD label only if it helps. Change them in the setup data.
6. EXP-05 s5: the boarded ship's gunnery drop is real in the sim; make it visible: a status line from his captain
   ("Their fire's slackened, Admiral.") when a boarded target's rate of fire drops.

Files you own: `src/battle/sim/boarding/**`, `src/battle/sim/comms/**`, the shield-trim function in `captains.ts`, the
house names and ship names in `src/battle/sim/setups/saturn-12v12.ts` (not the controller line), the morale-shock call
in `battle.ts` named in step 3, tests, `shots/pkg-14/**`.
Must not touch: roster generation in `captains.ts` and `admiral/**` (PKG-13, now), `src/battle/view/**` (PKG-12,
PKG-15), everything else beyond rule-9 lines.
Flag: none. Save: unchanged.
Assumed, for Caleb to overrule: the house names; the pods-at-flagship ruling.
You cannot prove: whether the captains sound like people (paste 15 new sample lines).
Acceptance: tsc; vitest; lint `src/battle/sim/**`; build; smoke; WORLD-01/02 built checks no worse than the tip you
merge onto (paste before and after). Browser `http://[::1]:5214/?skirmish&probe`: EXP-02 s8 and s10 (pods at their
flagship), EXP-05 s5, s6, s8, s9 on seed 5, screenshots. Report `reports/PKG-14.md`.

## Addendum, 2026-10-21 (sent to the running thread by message; this is the record)
7. **Boarding through an open side must be able to succeed (EXP-05 s4).** TRC-03 (`vision/traces/EXP-05.md` row 4): pods
   ordered at a side that is open (0) at launch are deflected because the side regrows 0 → ~100 during the ~14 s
   crossing, on both tries. Fix in `boarding/**` with numbers in `boarding/numbers.ts` (a collapsed side stays down long
   enough for a typical crossing, or regen is suppressed while pods are inbound or the side is under fire: your call by
   NAVY §1/§3, said in the report). Prove by a test (open at launch, typical range → breach unless the defender visibly
   re-powers that side and comms says so) and EXP-05 s4 in the browser on seed 5.
