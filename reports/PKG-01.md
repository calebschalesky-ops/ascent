# PKG-01: merge backlog (Talos seat)

Branch `claude/pkg-01`, base `claude/game` @ 4cffbb4, game tip at merge time 6eb7f42. Port 5201. 2026-10-21.

**Result: done.** Four finished branches merged, one merge commit each, plus one follow-up commit on the eve-controls
resolution. tsc clean, vitest 53 files / 687 tests pass (base 51 / 662), lint 18 problems vs 17 on base (one new
warning, brought in by eve-controls), build passes. Browser: new game, fly, fire, lock, shipyard; no console errors.

## Per branch

| Branch @ tip (checked at merge) | Result | Merge commit | Conflicts and how resolved | tsc / vitest after |
|---|---|---|---|---|
| `claude/eve-controls` @ cb412c2 | merged | bcaa924 (+ follow-up 2c9006d) | `Voyage.tsx`, 4 hunks, per the recipe (eve-controls THREAD-LOG "Collision with claude/integration-5"): imports unioned (`trackedGun` added to eve-controls' import, unused `AIM` dropped); eve-controls' lock step, `weaponOn` and both `combat.setLock` calls kept; its own lead block (AIM.gunArc 40°) replaced by integration-5's `trackedGun` fed `gunTarget(dt, actCraft)` (acceleration estimate kept); trigger on `firing \|\| loose \|\| switchedOn` with guide id `tracked.tracking && actCraft ? actCraft.id : undefined`; sight toward `actCraft`, `draw: drawing \|\| undefined`; `selectAt` dropped from the empty-space click and deleted with the now-unused `unitTo`. Follow-up 2c9006d: `gunTarget`'s "house holding fire" skip removed, see Assumed. | clean / 52 files, 673 pass |
| `claude/ship-loadout-look` @ 5eb3f30 | merged, **a5d4840 taken** | 1967cc4 | none (clean) | clean / 53, 685 |
| `claude/look-unify` @ 4c6232f (carries `one-look-per-people` @ 40d650f) | merged | 3f163ff | `src/styles.css`, 1 hunk in the `.kb-key` rules: look-unify's token versions taken, eve-controls' new `.kb-key.fixed` line kept | clean / 53, 686 |
| `claude/graphics-pass-3` @ 42f265f | merged | 7257cb1 | none | clean / 53, 687 |

All four tips matched the package's hashes at merge time. Not merged, as told: `wave-a-upgrades`, `specials-spawn`,
`graphics-pass-3-264f8a`, `one-look-per-people` separately.

## Script steps

This package makes no script step pass directly (foundation step "merge finished branches first").

| Check from the package | State |
|---|---|
| tsc / vitest / lint / build | pass (output below) |
| New game, fly, fire | pass: New game -> Humans -> pilot -> first ship -> launch; W throttles (speed 14); Fire button: 1 pulse shot |
| Shipyard view | pass: pause menu -> Shipyard shows the fitted cruiser (a5d4840 wiring), `shots/pkg-01/04-shipyard-fitted-ship.jpg` |
| E4 select + panel | pass: selected-item panel on a Selenitai Treasury, `05-e4-selected-panel.jpg` |
| E6 locks (C, lockShip), weapon number fires at the active lock | pass by probe: C on a selected hostile starts a lock, it completes in ~1.1 s and becomes active; `1` sets `weaponOn {on:true,target:11}`; 12 shots, 4 hits, 48 damage. Ship pinned in place by script each frame because of the idle-orbit whip (below). |
| E7 overview pinned | pass: pinned at the right edge on launch, `02-flight-overview-pinned.jpg` |
| E8 binds / controls list | pass: Controls page lists the mouse gestures (Ctrl+click lock, right-click menu, etc.) |
| E5 right-click menu by real right click | wired-but-unproven here (not clicked; eve-controls proved it by hand before the merge) |
| Console errors | zero (read_console_messages, errors only) |

Controls feel after the merge: Caleb's call (the package says this cannot be proved here).

## Flag and save

Flag: none. Save version: **not bumped by any branch.** eve-controls adds `settings.flight.ovPinned` with a default in
`freshData` and a fallback in `migrateFlight` (additive, tested in `store.test.ts`).

## What is still broken (found, not mine)

- Idle orbit at real scale whips a stopped ship away at thousands of units a second (already on TEAM-BOARD from
  eve-controls). It made every lock test need the ship pinned by script.
- The eve-controls panels (`.sel-panel`, `.ctx-menu`, `.lock-row`, `.overview.pinned`) use raw colours, not
  look-unify's tokens. They merged as written.
- One new lint warning: `SelectedPanel.tsx` react-refresh/only-export-components (eve-controls). Not fixed.

## Requests

- **Wave A session (<session>), `Shipyard.tsx`:** a5d4840 touched it (6 lines: the fitted ship in the shipyard).
  Taken per the package; your branch will meet it when it merges onto `claude/game`.
- **Zeuxis / look-unify owner:** move the eve-controls panel colours onto the tokens.
- **Scale-jump owner:** no idle orbit (or a speed cap) near a hostile, as eve-controls asked.

## Assumed, for Caleb to overrule

- Guns now lead the active lock through `trackedGun`, so the gun arc is EVE.gunArc **60°** (integration-5's), not
  eve-controls' 40° (`AIM.gunArc`). That is what the recipe says. The 40° figure is still in eve-controls' text.
- `gunTarget` no longer skips ships of a house holding fire (integration-5 skipped them for the *selection*). Locks only
  take hostile ships, and eve-controls' rule is that guns lead the active lock. At the start the Selenitai report
  `hold` and are flagged hostile, so with the skip a locked Selenitai cruiser would have got no lead.
- An empty-space single click no longer selects anything (selectAt dropped, per the recipe); `pickAt` handles objects.

## Evidence

Final acceptance, in the worktree on `claude/pkg-01` @ d4e4366 (after merging `claude/game` @ 6eb7f42 in):
```
2026-10-21 14:47:49
HEAD d4e4366
$ npx tsc -b
exit 0
$ npx vitest run
 Test Files  53 passed (53)
      Tests  687 passed (687)
$ npm run lint
  148:92  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/exhaustive-deps')
✖ 18 problems (7 errors, 11 warnings)
$ npm run build
✓ built in 13.17s
```
Base (game worktree @ 6eb7f42): vitest 51 files / 662 passed; lint 17 problems (7 errors, 10 warnings). Lint diff
(eslint JSON, by file and rule): the only new entry is `src/components/controls/SelectedPanel.tsx
react-refresh/only-export-components`.

`git log --oneline --first-parent 4cffbb4..HEAD` on `claude/pkg-01`:
```
d4e4366 PKG-01: merge claude/game @ 6eb7f42 into claude/pkg-01
2c9006d PKG-01: eve-controls resolution follow-up: guns lead any active lock
7257cb1 PKG-01: merge claude/graphics-pass-3 @ 42f265f (painted-pilot picker, gemini-clean rules)
3f163ff PKG-01: merge claude/look-unify @ 4c6232f (with one-look-per-people @ 40d650f)
1967cc4 PKG-01: merge claude/ship-loadout-look @ 5eb3f30 (incl. wiring a5d4840)
bcaa924 PKG-01: merge claude/eve-controls @ cb412c2 (E4-E8)
```
`git diff --stat 4cffbb4 d4e4366`: 90 files changed, 2340 insertions(+), 339 deletions(-) (plus this report and
`shots/pkg-01/`).

The game-branch merge, the gate output and `git log --first-parent -3` on `claude/game` come after this commit by
the house-rules order; they are in the PKG-01 final message.

Screenshots: `shots/pkg-01/01-first-ship-fitted.jpg`, `02-flight-overview-pinned.jpg`,
`03-flight-after-lock-fire.jpg`, `04-shipyard-fitted-ship.jpg`, `05-e4-selected-panel.jpg`.
