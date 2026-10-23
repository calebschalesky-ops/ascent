# PKG-18-maneuver-fixes
Label: PKG-18 · Kind / seat: build / Talos with Kalliope for one name (read `<local>`) ·
Base: claude/game @ <launch prompt> · Port: none (headless; one browser check optional on 5218) · Worktree `pkg-18`

Makes these steps pass: EXP-03 step 7 (Helm 9 finishes sooner **and holds the path tighter** than Helm 3, on every one
of the six maneuvers, not only the broadside and the crossing). Script `vision/scripts/EXP-03.md`.
Read first: `reports/PKG-12.md` (Requests: the flanking arc is not tighter for Helm 9 in 4 of 5 live setups, by
PKG-10's measure), `reports/PKG-10.md`.

## Measured
- Flanking arc: Helm 9 not tighter than Helm 3 in 4 of 5 live setups (PKG-12).
- Broadside pass ghost path dog-legs far off the line before coming back
  (`shots/pkg-12/exp03-step3b-ghost-line-broadside-pass-eta-2m49.jpg`, the dashed line runs ~1/3 of the screen away to
  the planet side and back). A broadside pass should run parallel to the target, guns trained across (BRIDGE §12b).
- Ship name "Kraken" (in the setup) is Norse; names come from Greek, Roman and Byzantine history and `LORE.md`.

## Do
1. Helm tightness on all six maneuvers: a test per maneuver comparing Helm 9 vs Helm 3 on the same geometry, both
   "finishes sooner" and "max deviation from the ideal shape smaller".
2. Broadside pass: the approach leg joins the parallel run without a long detour; a test bounds the path's lateral
   excursion away from the target line.
3. Rename "Kraken" to a Greek/Roman/Byzantine ship name (and check the other 23 names against the same rule; list any
   you change).
4. Previews still equal flown paths (PKG-10's test).

Files you own: `src/battle/sim/maneuvers/**`, the ship-name strings in `src/battle/sim/setups/saturn-12v12.ts`, tests.
Must not touch: `numbers.ts`, `captains.ts`, `checks.ts`, `boarding/**` (PKG-16, running now), `src/battle/view/**`
(PKG-17), everything else beyond rule-9 lines.
Flag: none. Save: unchanged.
Acceptance: tsc; vitest; lint `src/battle/sim/**`; build; smoke; WORLD-01/02 built checks at `--seeds 10` no worse than
the tip you merge onto (paste before and after). Report `reports/PKG-18.md`.
