# Trace EXP-04: The battle plays like a film
Traced by TRC-06 (Momus seat) on the launch tip `4b5914c`, 2026-10-22, seed 4, `http://[::1]:5236/?skirmish`, real drags
over CDP, time stepped in 0.1 s frames. Evidence: `shots/trc-06/`, `shots/trc-06/probe-log.md` (D). **Was (wave-05)** is
TRC-05's result.

| Step | How | Player does | Player sees (checkable) | Vision ref | Was (wave-05) | Result | Evidence / what happened |
|---|---|---|---|---|---|---|---|
| 1 | ui | Touches nothing for 60 s | ≥1 wide shot holding both fleets and ≥2 cuts; shot log ≥3 shots, ≥1 wide | §7a | pass | pass | 12 shots in 60 s: wide 6, close 6, shotsPer20s 4.0, maxGap 8.03 (D1). `shots/trc-06/exp04-s1-seed4-60s-director.jpg` |
| 2 | ui | Keeps watching | Cuts land on what matters; each close shot names its event | §7a | pass | pass | Close shots at 8.0, 21.6, 29.6, 32.8, 40.8 on Ekklesia (p8: boarding run on her, port shield down, breach, taken, breaks apart) and 54.3 on e2, the same subjects TRC-05 logged (D1). |
| 3 | ui | Moves the camera himself | Director gives way at once, same frame | §7a | pass | pass | Real drag at 0:49: director mode and camera mode "player" on the next read (D2). `shots/trc-06/exp04-s3-drag-player-mode-seed4.jpg` |
| 4 | ui | Leaves the camera alone | Director takes over after about 8 s (assumed) | assumed | pass | pass | modeLog 49.0 player "player input" → 57.03 director "no camera input for 8 s" (D2). |
| 5 | ui | Big moment elsewhere while he holds the camera | Picture-in-picture; his camera does not move | §7a | pass | pass | Camera focus e12 at 0:24 and a small drag every 4 s: insets "boarders breach Ekklesia, port side" 27.7, "Ekklesia taken by boarding" 32.8, "Ekklesia breaks apart" 39.1; focus stayed e12, camera player (D3). `shots/trc-06/exp04-s5-pip-seed4.jpg` |
| 6 | probe | Same seed twice, different camera use | Identical outcome | BRIDGE §12b r1 | pass | pass | Untouched against 22 drags and zooms: endT 206, tick 6180, rng {s 2457749769, n 2318}, statuses identical (D4). |

Feel checks (Caleb only): not judged here.

**Score 6/6** (wave-05: 6/6). Most important non-pass: none.
