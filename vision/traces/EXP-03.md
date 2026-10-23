# Trace EXP-03: The tactical view at 25%, and maneuvers with ghost lines
Traced by TRC-06 (Momus seat) on the launch tip `4b5914c`, 2026-10-22, seed 3, `http://[::1]:5236/?skirmish`, real keys
and clicks over CDP. Evidence: `shots/trc-06/`, `shots/trc-06/probe-log.md` (C). **Was (wave-05)** is TRC-05's result.
New since wave-05 here: PKG-21 (maneuver commits and refusals said on screen, "Boarding run · no hangar").

| Step | How | Player does | Player sees (checkable) | Vision ref | Was (wave-05) | Result | Evidence / what happened |
|---|---|---|---|---|---|---|---|
| 1 | ui | Opens the tactical view (one key) | Hologram view; time scale 0.25, never 0 | §7a, T1 | pass | pass | Real `t`: tactical on, timeScale 0.25, grid hologram with ship glyphs, banner "TACTICAL · TIME 25% · T TO CLOSE" (C1). `shots/trc-06/exp03-s1-after-T-tactical-view.jpg` |
| 2 | ui | Looks at ships in it | Four shield arcs per ship; enemy arcs only as known | T1; §7a | pass | pass | 24 arc sets; his ships "up 47%", "up 100%" etc.; enemy rings drawn dotted where unknown (C1). Same shot. |
| 3 | ui | Picks a maneuver: broadside pass | Ghost line and time to completion before commit | BRIDGE §12b r3 | pass | pass | Agora card, Herald clicked, "Broadside pass": stage ghost, "Broadside pass · 2:05", panel "Time to complete 2:05" (C2). `shots/trc-06/exp03-s5-ghost-broadside.jpg` |
| 4 | ui | Commits it | Ship flies the shown path | §12b | pass | pass | Committed at 0:26 by Enter: done at 125.37 against eta 26.3 + 99.0, maxDevM 2.8 over 2,971 samples, withinTol (C3). Committed at 0:03 instead, the run was broken off at 72.0 with maxDevM 2.1 (Agora, Nerve 2, mood panicked). |
| 5 | ui | Orders the other five maneuvers | Each previews and flies, different shapes | M1 | pass | pass | Crossing the line (Pnyx, 1:58), flanking arc (Bema, 0:51), boarding run (Astu, 4:09), defensive wheel (Hyperion, 0:24, "threat: the nearest enemy (click one to choose)"), fighting withdrawal (Thalassa, 1:21): five ghosts of five shapes, flown within 0.4–2.1 m; flank done 58.7, wheel 34.4, withdrawal 92.6 (C2). `shots/trc-06/exp03-s5-ghost-{crossing,flanking,boarding,wheel,withdrawal}.jpg`. Stoa's Boarding run now says so on the panel: "Stoa cannot fly the Boarding run: no boarding hangar in the group. Enter or Commit closes this; Esc cancels." (`-ghost-stoa-boarding-refused.jpg`; TRC05-7's first half fixed). |
| 6 | ui | Cancels a maneuver halfway | Short believable turn, within turn limit | §12b r4 | pass | pass | Agora's crossing (eta 1:11) cancelled at 0:31.5 by a menu Attack on Io: brokenOff 31.5, turns afterBreak 1, heading 0.21 → 1.80 over 13 s, max 11.2°/s (C3). `shots/trc-06/exp03-s6-cancel-crossing-with-attack.jpg` |
| 7 | probe | Same maneuver to Helm 9 and Helm 3 captains | Helm 9 finishes sooner and tighter | §12b | pass | pass | Agora (Helm 9) against Pnyx (Helm 2), separate runs, seed 3 (C3). Flanking arc done in 48.2 s vs 85.7 s; defensive wheel 25.9 s vs 32.5 s. Following error is no smaller for Helm 9 (0.8 / 1.9 m vs 0.2 / 1.0 m); both inside tolerance. Same reading as TRC-05: sooner and a shorter path. |
| 8 | ui | Has order lines on screen | Every standing order drawn ship to target | T1 | pass | pass | Six maneuver orders through the UI → six entries in `comms.lines` and six lines on the table (C2). `shots/trc-06/exp03-s8-order-lines-tactical.jpg` |
| 9 | ui | Closes the tactical view | Time back to 1x; never paused | §7a | pass | pass | Real time: in the view battle time rose 1.13 → 2.23 over 40 samples (about 4 s), never stalled more than two samples; real `t`: timeLog off at 2.27 (1x), then 2.57 → 4.73 in 2 s (C4). `shots/trc-06/exp03-s9-after-T-closed.jpg` |

Feel checks (Caleb only): not judged here.

**Score 9/9** (wave-05: 9/9). Most important non-pass: none. Seen: a Boarding run whose target leaves keeps flying for
minutes and says "order refused (boarders away)" (TRC05-7, second half, still open).
