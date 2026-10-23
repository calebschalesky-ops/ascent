# PKG-22: comms clarity (Talos, with Kalliope for lines)

Branch `claude/pkg-22`, launch tip 59003b6, merged game tip 473528b into it (3c1b506). Played 2026-10-22 on
`http://[::1]:5222/?skirmish` (dev server on 5222, own tab, pane hidden, time stepped with `__probe.advance()`).
Scope: QA-05 F-03, F-04, F-07, F-08, F-09, F-10, F-14, plus Daedalus's TRC-05 addendum (TRC05-2, -3, -6, -8).

## Result

**Pass.** The player opened a side, sent the pods with one key, and captured a ship by his own order, at 1280 and
again at 800, on seed 1, same timings both times. WORLD-01 and WORLD-02 at `--seeds 10` are identical to the tip in
every check row that the change could touch (tables below). Flag: none. Save: unchanged (comms state gains optional
fields `cursorId`, `watching`; the skirmish has no save).

### The full battle by his own order (seed 1, `?skirmish`)

1. 0:00. Click the enemy cruiser Sceptre (`e9`, client 945,549 at 1280 / 591,343 at 800). She becomes the target.
   (A first click at 985,383 at 1280 landed under the crew panel and picked nothing. That's PKG-17/21's off-screen
   target request, not this package.)
2. Crew panel, **Master of guns**, then **Guns on…** / **All guns on Sceptre**. The log reads "Astu: aye, guns on target".
3. 0:17. The master of guns: *"Sceptre's bow is open, Admiral. We are hitting hull."* with **Q Send the pods /
   E Keep firing**. Press **Q**. Reply: *"Pods away for Sceptre."*
4. 0:17 to 0:52. Breach, then the marine commander: *"Even fight on Sceptre's decks, 90 to 86. Your call, Admiral."*
   Left alone (carry on).
5. 0:52–0:53. **Prize taken** card: *"Sceptre is ours. She flies our colours now. House of Kleisthenes is at 13 on
   the board, 12 + 1 taken."* Scoreboard: `13/13 12 + 1 taken`, enemy `11/11 1 lost to boarders`.

Shots: `shots/pkg-22/03-…` (the card at 0:17), `04-…` (the capture at 1280), `07-…` and `09-…` (800).

## Findings, what changed, re-play

"Before" shots are Momus's own from QA-05 (`shots/qa-05/`, build ad81038). I did not re-run the tip in a second
server.

| Finding | What changed | Re-played (after) | Before |
|---|---|---|---|
| F-03 open side | New `sim/comms/sides.ts`. The master of guns watches the ship his guns are on and the ship the admiral picked as target (`watchShip`, set by the controller's `targetShip`). He reads only our own hits off the log (a hit through to the hull), the same evidence the tactical arcs use, never the enemy's true shields. He raises a decision, **Send the pods / Keep firing**. The pods go at that side: officers.ts passes `o.side` into the `board` order (the "pods-side line" is `officers.ts` launchPods; nothing in `boarding/**` needed to change). It is silent while our pods or marines are already on her. A hit that splashes on that side closes the card with "back up". Tactical arcs at 1280: `tactical/numbers.ts` arcGap 6→9, arcWidth 2.8→3.6, arcMin 2.2→3, arcMax 6→7; `tactical.css` lines 15–17: an enemy side seen down is solid and glowing (was dashed 3 2), breach tick 2.4→3.2, unknown 1 4/.55→2 4/.7. | 1280: `01-…`, `03-…`, `10-…`, `11-…` (zoom). 800: `07-…` | `qa-05/17-run4-enemy-shield-arcs-unreadable-0037.jpg` |
| F-04 / TRC05-2 keys | The keys answer the card that is highlighted **on screen**: the controller passes the snapshot's selected id into `answerTop(b, i, id)`. A card that closed before the key landed says "Too late: X already decided." and nothing else is answered. Tab holds its card by id (`cursorId`). When that card closes, the selection goes back to the top, not to whatever slid into its slot (found in play at 1:29 and fixed). Clicks answer their own card (`answerReport`). **Ruling:** R answers whenever a report waits. On a card with two answers it says *"That report has two answers: Q Pull back, E Carry on."* and does not move the camera. With nothing waiting, R resets the view. The help line follows `canAnswer(2)`, so the screen and the key agree. QA's 1:16 miss was R on a two-answer breach card resetting the camera: PKG-09's rule caused it. | 1280: `05-…` (R on a two-answer card, hint says "R answers"), `06-…` (the notice). E then answered the highlighted card #39 (verified by id). | `qa-05/14-…`, `15-…` |
| F-07 / TRC05-8 capture | A capture either way is its own card, held 15 s at the top of the status lines: "PRIZE TAKEN" (green) or "SHIP TAKEN" (red). The text opens with the news ("X is ours", "X is taken") and ends with the board count ("12 + 1 taken"). The scoreboard header adds "12 + 1 taken · 1 lost to boarders" (`Skirmish.tsx` hud `caps` lines, `capturesOf` in `comms/logic.ts`). The end table row is now "Enemy ships it captured". | 1280: `02-…`, `04-…`. 800: `09-…` | `qa-05/10-…`, `11-…` |
| F-08 answers | A shield-down card offers Reinforce, **Turn a fresh side** (a `defensiveWheel` maneuver) and Carry on. Turn comes first when the captain asked to turn. Fall back stays as a fourth button with no key, so a Protector's own call is unchanged. Boarders inbound: **Shields to {side}**, the side the pods aim at (an up side throws pods off), then Carry on / Fall back. | 1280: `04-…` ("Shields to fore"). 800: `08-…` (four buttons) | QA-05 run 3 at 0:44 (no shot) |
| F-09 one card | New `sim/comms/shown.ts`. Of one captain's open cards only one is shown and answerable: his oldest PKG-02 request, else his newest. The others still time out exactly as before, so captains act the same and an idle battle is unchanged. Their timeout line goes into the flag lieutenant's summary. Answering his card closes his other unseen cards. A second request waits its turn. | Tests (`pkg22.test.ts`). In play I did not catch two cards from one captain at once. | `qa-05/09-pnyx-contradictory-replies-0128.jpg` |
| F-10 / TRC05-3 log names | `simFeed.ts` order line uses `orderSay()` (lines.ts `ORDER_SAY`): "aye, guns on target", "aye, pods away", "aye, boarders away", "aye, shields reset". | Every 1280 shot's log, e.g. `04-…` | QA-05 F-10 text |
| F-14 relay | Once the flagship is out, her officers' open cards close and no one speaks as them. Officer traffic comes from the senior captain still in the fight (active first, then a running one). | Test only. I could not get the flagship lost in a UI run this session: one run to 6:09, flagship alive. | QA-05 F-14 text |
| TRC05-6 marine numbers | The marine commander quotes the deck fight's last logged figures. His words follow them: behind is "losing", ahead but under the reinforce margin is the new "close", otherwise "holding". He never says "outnumbered" with the bigger figure. | In play: "Even fight on Sceptre's decks, 90 to 86." | TRC-05 text |

## Script steps

| Step | State |
|---|---|
| Phase A done point 4 by the player (open a side, board, capture) | **pass** (seed 1, at 1280 and 800, above) |
| EXP-05 steps on open sides and captures | **pass**: open-side report, pods at that side, capture card both ways (the loss way by test and by an AI capture in play, `02-…`) |
| EXP-02 one-key answers | **pass**: Q/E/R on the card shown, R says why on a two-answer card |
| F-09 contradiction in play | **wired-but-unproven** in the UI (tests pass) |
| F-14 in play | **wired-but-unproven** in the UI (tests pass) |

## What is still broken (not mine)

- At 1280 the crew panel covers enemy ships (my first Sceptre click missed). That is PKG-17's request, routed to PKG-21.
- Seven lint errors in `src/components/**` were there before this package. `src/battle` is lint-clean.

## Requests

- PKG-21: R is now a comms key whenever a report waits. If the camera reset needs a key of its own at that time, add
  one (for example Home) next to the R line in `Skirmish.tsx`.
- Fighters: "Fighters to her" (F-08's example) is not offered, because fighters are stored only (`numbers.ts`
  FIGHTER_TASKS, "a later package"). Once fighters fly, add the answer to the boarders-inbound card in `tick.ts`.

## Assumed, for Caleb to overrule

- "Any ship the player has selected" means the enemy he picked as target (the target ring). His own selected ship is
  not watched.
- Boarders inbound is answered with "Shields to {side}", not fighters (see Requests).
- The four `COMMS` numbers are first-pass, for Palamedes: sideOpenS 8, sideOpenCooldownS 15, captureShowS 15.
- Daedalus's addendum named `simFeed.ts`' order line and the `Skirmish.tsx` scoreboard and end-table lines as mine. I
  touched only those lines. The merge kept PKG-20's import line next to mine.

## Evidence

WORLD, `npm run sim -- --script WORLD-0N --seeds 10 --minutes 15 --no-write`:

- Launch tip 59003b6 (before): WORLD-01 every built check passed (5 pass, 1 not built, 1 not run). WORLD-02 7 pass;
  c3 "8 of 10; good victory 5, withdrawal 5 … idle lost 4 3 3 4 4 3 3 3 4 4".
- Branch before the merge (after): identical. WORLD-02 c3 8 of 10, the same idle and good figures. c5 orders 97 85 80 72
  121 85 92 92 114 85, the same as before.
- Game tip 473528b: WORLD-01 5 pass. WORLD-02 7 pass, c3 "10 of 10; good victory 4, withdrawal 2, timeout 4".
- Merged (3c1b506): WORLD-01 5 pass, rows 1–5 identical to the game tip. WORLD-02 7 pass, c3 "10 of 10; good victory
  5, withdrawal 2, timeout 3", the rest identical.
- During the work, my first F-09 version (closing a captain's older card) dropped WORLD-02 c3 to 7/10, and an
  "older card decides now" version dropped it to 6/10. Bisected by switching each behaviour off. That is why F-09 is
  now presentation-only.

Acceptance on the merged branch, 2026-10-22 11:56 PDT: `npx tsc -b` clean. `npm run lint`: 18 problems (7 errors, 11
warnings), all in `src/components/**`, the same as before. `npm run build`: files generated. `npm run smoke`: SMOKE
PASS (skirmish 60 frames, voyage pass). `npx vitest run --maxWorkers=4`: 69 files passed and 2 failed,
`pkg16.test.ts` and `tactical.test.ts`. I did not change either file. Re-run alone at 12:02
(`--maxWorkers=1`): 2 files, 14 tests passed, so the failure was load (A9).

Screenshots: `shots/pkg-22/01…11`.

The gate output and `git log` after the merge are in the "Gate" section, added after the merge.

## Gate (game worktree, after the merge, 2026-10-22 12:03 PDT)

`git log --first-parent --oneline -3` on claude/game:

```
6949c2f Merge PKG-22: comms clarity (open-side report, keys answer the card on screen, capture cards, matching answers, one card per captain, order words, officer relay)
473528b Merge PKG-19: good and bad plans as the scripted policies, sim --from; c3 and W01 c6 held-out fails per ruling
06ea20b Merge PKG-20: setup registry, 19 named setups at six bodies, roster fixtures, body drawn per setup
```

`git diff --stat HEAD^1 HEAD` (the merge):  35 files changed, 669 insertions(+), 67 deletions(-)

- `npx tsc -b`: clean
- `npx vitest run --maxWorkers=4`: Test Files 71 passed (71), Tests 912 passed (912), 56.56 s
- `npm run build`: files generated (dist/sw.js, workbox)
- `npm run smoke`: SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (34.3 s)
