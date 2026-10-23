# TRC-02: re-score of every script on `wave-02` (f8c0735)

Seat: Momus (trace). Date: 2026-10-21. Worktree `trc-02`, branch `claude/trc-02`. Browser: own tab at
`http://[::1]:5220/?skirmish&probe`, dev server on 5220, pane visible. Sims run in Node from the same worktree.
Time taken: about 20 minutes, 15:52 to 16:12 PDT (sims 15:57, last probe 16:02, first merge gate 16:05–16:07).

## Scoreboard

| Script | Passes / total | Most important non-pass |
|---|---|---|
| EXP-01 fleet battle | 7 / 8 | s8: at 375 px the comms "queue" is an event log; legibility of the real queue untested |
| EXP-02 command through captains | 0 / 12 | s1–4: comms queue and Q/Tab/E exist in the sim only; nothing on screen |
| EXP-03 tactical view | 0 / 9 | s1: no tactical view, no key; 0.25 time scale is a probe verb only |
| EXP-04 film | 2 / 6 | s1–2: "director" is one fixed wide framing that zooms; no cuts, no shot log |
| EXP-05 board and capture | 1 / 9 | s7: capture works on screen (colours flip, roster updates), but the player cannot cause one |
| EXP-06 morale, win or lose | 0 / 7 | s6: victory unreachable: no orders, and no sim policy ever beat the Jupiter admiral |
| WORLD-01 idle battle | 6 / 7 | c7: no director shot log |
| WORLD-02 decisions not luck | 5 / 7 | c3: scripted-good beats idle on 4 of 10 seeds only |
| **Total** | **21 / 65** | |

Traces: `vision/traces/<script>.md`. Evidence: `shots/trc-02/*.jpg` (11 screenshots), `shots/trc-02/probe-log.md`
(probe readings P1–P11), `shots/trc-02/sim-WORLD-01-idle.txt`, `sim-WORLD-01-swap-nerve-judgement.txt`, `sim-WORLD-02.txt`.

## Non-pass rows by system

**Comms queue and answering (sim built, UI missing).** EXP-02 s1, s2, s3, s4 missing; EXP-02 s5 partial (the timeout
choice and its line exist in `sim.comms.history`, never on screen); EXP-05 s6 missing; EXP-01 s8 partial (log, not queue).

**Direct orders and the flagship's crew (sim built, UI missing).** EXP-02 s6, s7, s8, s10, s12 missing; EXP-02 s11
partial (cannot steer, but nothing can be ordered either); EXP-05 s1, s3, s4 missing; EXP-06 s2, s3, s5 missing.

**Maneuvers (sim stores the name only; nothing flies).** EXP-02 s9 missing; EXP-03 s3–s7 missing.

**Tactical view and order lines (not built).** EXP-03 s1, s2, s8 missing; s9 blocked by s1.

**Director camera (wide framing only).** EXP-04 s1 partial, s2, s4, s5 missing; EXP-06 s4 partial (comms shows breaks,
director does not); WORLD-01 c7 missing.

**Boarding feedback on screen.** EXP-05 s5 partial (7 fights inside, no report reaches the screen); s7 partial
(capture seen, unorderable); s9 partial (end screen does not weigh a capture against a wreck; "Captured" row does not
say by or from).

**Enemy captain reaction.** EXP-05 s2 partial: Second Crown reacted to 1 of its 3 shield sides falling.

**Morale and the outcome (balance).** EXP-06 s1 partial (no wing morale); s6 missing; s7 partial (defeat came from
losses at 2:13, the flagship fell at 2:56, after the break). WORLD-02 c3 partial (4 of 10) and c6 partial (7 of 10;
the 3 misses are seeds with no boarding push at all, every push that happened was telegraphed).

## What a player hits first (MEASURED-HERE)

1. The only help line is "Drag to turn · wheel to zoom · R to reset". Nothing says how to command. Q, Tab, E and T do
   nothing. A first-time player watches; he cannot play.
2. Every idle battle is the same: his line breaks at about two minutes and 7–10 of his 12 ships flee while the enemy
   loses 0–3. Across 60 sim runs against the Jupiter admiral, idle, swap, scripted-good and scripted-bad alike, the player
   never wins. WORLD-02 check 2 passes only because the enemy wins every seed.
3. End screen: the headline says "6 of 12 ships lost" while the table says Ships lost 2 (seed 1). The headline counts
   fled ships and the table does not. MINOR.
4. The skirmish has no title-screen entry (flag `skirmish` off); `?skirmish` is the only way in.

## Not exercised

Feel checks (Caleb's). Offline/network kill. Two tabs. Title screen without `?skirmish`. The F5 key did not reload
through the harness on 2026-10-21 (performance.now() 89 s after), so the reload was done by navigating to the same URL.
Re-test costs 1 call.

## Requests

None. TRC-02 changes docs and images only.

## Gate evidence

Merge `c26ce74` (Merge TRC-02: wave-02 re-score, eight traces, 21/65), lock taken 16:05, no lock present before.

`git log --first-parent -3 --oneline` on claude/game after the merge:
```
c26ce74 Merge TRC-02: wave-02 re-score, eight traces, 21/65
57f376d Daedalus: wave 3 running
3dacf09 Daedalus: wave 2 verified, wave-02, wave-3 packages
```
`git diff --stat c26ce74^1 c26ce74`: 24 files changed, 423 insertions(+) (vision/traces 8, shots/trc-02 15, reports 1: docs and images only).

Gate in the game worktree on c26ce74:
```
Wed Oct 21 16:05:38 PDT 2026
$ npx tsc -b
exit 0
$ npx vitest run
   Start at  16:05:56
   Duration  19.32s (tests 81%, import 13%, transform 5%, worker 1%)

    Isolate  58 workers spawned · ~479ms startup each (spawn + environment, per file)
             at least ~1.37s faster with isolate: false — reuses workers across files instead of one per file

exit 0
$ npm run build
precache  40 entries (2695.51 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
exit 0
$ npm run smoke

[0.7s] vite on http://[::1]:5290
[BABEL] Note: The code generator has deoptimised the styling of <temp> as it exceeds the max of 500KB.
[15.8s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":22,"shots":486,"movedBySide":[11,11],"drawCalls":164} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[20.4s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (20.4s)
exit 0
Wed Oct 21 16:07:19 PDT 2026
vitest summary: Test Files 58 passed (58), Tests 774 passed (774)
```
