# Daedalus board: Ascent Flight, Phase A

## Play card: wave 6 (2026-10-22)

**Start it:** in PowerShell, one command, then leave the window open:
`npm --prefix <repo> run dev -- --port 5230 --strictPort --host ::1`
Open `http://[::1]:5230/` and click **Fleet battle**. (Port 5230 on [::1], so your own save on 5293 is untouched.)
Checked by Daedalus: smoke passes on this tip (headless Chrome boots the battle and the voyage); TRC-06 played it from
the title screen (67 shots). Could not open it live in my own pane on 2026-10-22: the app refused a sixth dev server
for this folder (five held by other chats).

**Score:** Phase A 39/65 at wave 3 → 56 at wave 5 → **55/65** now. The one drop is a check judged more strictly (fresh
seeds), not a break; it is question 13 below.

**What changed, in player terms**
- The battle is on the title screen ("Fleet battle").
- The master of guns tells you when an enemy side is open; Q sends the pods at it. Captures get their own card, both
  ways, and the scoreboard says "12 + 1 taken".
- Keys answer the card that is lit; maneuvers commit; a refused order says why; a missed click says so.
- An enemy list lets you order ships that are off screen; ordering an escort off its screen warns you.
- Fighters fly: fighter command's Escort, Screen and Hunt launch real wings, and pods can be shot down on the way in.
- A beaten fleet ends the battle instead of drifting on for minutes.
- Flags: `skirmish` on, `fighters` on, `director` on, `tactical` on.

**Try (about 30 minutes)**
1. *Take a ship (5 min).* Press T for the tactical view (25% speed; the comms are readable there). Click Master of guns,
   "All guns on" an enemy cruiser. When the card says she is open on a side, press Q. Watch for "She flies our colours".
2. *Win (15 min).* Leave your four escorts alone (that is what loses games). Put everyone else on the smallest enemy
   ships first; board open sides with the flagship. TRC-06 won seeds 6 and 7 this way.
3. *Phase B peek (2 min).* `http://[::1]:5230/?skirmish&setup=europa-12v12` is the same battle at Europa; 19 setups
   at six bodies exist for Phase B.

**Feel checks only you can judge**
- Does the comms queue feel like commanding, or like busywork (TRC-06: ~15 answers wanted in the first two minutes)?
- Does the battle need a build-up before the first shot (it opens fire at 0:00)?
- Do the captains sound like people (item 7)?

**Questions for you** (numbers as on the board's "For Caleb" list; 1, 2, 5, 6, 10, 11, 12 are assumptions I am
building on unless you say otherwise)
- **13, the big one:** "never luck" (done point 5) failed three packages in a row. The battle is chaotic: TRC-06's
  winning plan **loses when the first order lands 1/30 s earlier or later** (8 starts, 2 wins). My recommendation:
  judge "decisions matter" on the 30-seed average, and give a package to making the battle less sensitive to tiny
  timing (that is a design change to how the sim resolves, so I want your yes).
- 3: commit the vision documents to git so they can't be lost?
- 4: two calls PKG-01 kept (guns lead a locked ship even if its house holds fire; gun arc 60° not 40°).
- 8: pods may go at the enemy flagship (VISION §7a) though NAVY §3 says only an admiral leading in person may.
- 9: fair rosters (equal ability totals per hull class) are on; without them a good player won 0 of 30.

Reply here with anything: what broke, what felt wrong, what you want instead.


Kept by Daedalus (session <session>, "Ascent update management"). A fresh Daedalus resumes from this file alone.
Method: `<local>` + `METHOD-AMENDMENTS.md` (A1–A10). Rules for
threads: `HOUSE-RULES.md`. History: `DAEDALUS-LOG.md`.

**Scope (Caleb, 2026-10-21, `vision/visions/2026-10-21-scope-caleb.md`):** Phase A only, the six done points and
packages of `vision/visions/2026-10-21-phase-a-prompt.md`, run by the method. Port 5293 is his; test saves on [::1];
no Red Rising names; stay in Phase A.

## State
- **Game branch:** `claude/game`, worktree `.claude/worktrees/game`. Tags: `wave-00` (ed63d04, start), `wave-01`
  (a571a1c), `wave-02` (f8c0735), `wave-03` (68fb1a4), `wave-06` (bdbcb27: TRC-06 + PKG-25, smoke PASS), `wave-05` (54e185a, TRC-05 56/65), `wave-04` (67e8c97: all wave-4 packages verified, smoke re-run by Daedalus).
- **Gate:** tsc, vitest, build, `npm run smoke`. At wave-04: vitest 66 files / 857 passed.
- **Merge lock:** free unless `MERGE.lock` exists in the game worktree. Daedalus's own commits take it too.
- **Verify worktree:** `.claude/worktrees/verify` (detached; Daedalus re-runs acceptance there, never in game).
- **Vision docs** are untracked files in the main checkout only; read by absolute path; nobody commits or edits them.
- **Play it:** `npx vite --port 5230 --host ::1` in the game worktree, then `http://[::1]:5230/?skirmish`.

## Scoreboard (TRC-03 trace of `wave-03`, authoritative, plus wave-4 merges as reported and verified)
| Script | wave-03 trace | Since (reported, verified merge) | Top non-pass |
|---|---|---|---|
| EXP-01 12v12 at one body | 8/8 | | |
| EXP-02 captains, comms, orders, crew | 9/12 | 11/12 (PKG-14: s8 split holds 60 s; s10 pods at their flagship) | s8 "All port" overridden by the flag captain 0.9 s later (PKG-14) |
| EXP-03 tactical view, maneuvers | 0/9 | 8/9 (PKG-12: 1–6, 8, 9) | s7 Helm 9 not tighter on the flanking arc in 4 of 5 setups (PKG-10's measure) |
| EXP-04 directing camera | 6/6 | | |
| EXP-05 shield side, board, capture | 3/9 | 8/9 (PKG-14: 4 with item 7, 5, 6 via Q, 8, 9) | **s4: boarding at an open side deflected: the side regrows during the 14 s crossing** (PKG-14 item 7) |
| EXP-06 morale break | 1/7 | | **s6: three real-click games, all defeats; playing broke sooner than idle; ~40% of clicks on enemy ships missed** (wave 5) |
| WORLD-01 do nothing | 7/7 | 6/7 at 30 seeds | **c6 (traits change the battle) 19/30 vs bar 24/30; was 22/30 before item 7: it never held at scale** (wave 5, Palamedes) |
| WORLD-02 never luck, AI admiral | 5/7 | 7/7 at 10 seeds (PKG-13); at 30: c3 21, c6 22 (bar 24) | fair rosters ruled ON and checks 3–4 amended (outcome first) → PKG-16 |
| **Total** | **39/65** | **56/65** (10-seed); 30-seed bars open: WORLD-01 c6, WORLD-02 c3, c6 | MAJOR: our capture reported as "We lost the decks" (PKG-14); R's help line says reset view |

## Phase B (received 2026-10-21 19:30; waits on Phase A's wave 5 for files)
Scripts (SCR-B, dd67af1, verified: only `vision/scripts/**`, counts re-counted): EXP-07..15 (104 steps), WORLD-03..06
(38 checks). Inventory `vision/scripts/PHASE-B-INVENTORY.md`: **0/142 pass, untraced (A1); 27 exist, 50 partial, 65
missing.** Packages along code lines (inventory table): S2 setups and rosters, F1 fighters, N2 boarding (then B4 on
the same line), N3 morale, B2 truth, B3 intent, B5 staff and commodores, M2 maneuvers, AI2 admirals, Q-B. Order: S2 and
F1 first, N2→B4 with N3 beside, then B2, B3, then B5, M2, then AI2, then Q-B. Dispatch after wave 5's last merge.

Rulings on SCR-B's flags (Daedalus, 2026-10-21):
- Flags 7, 8: fighters (F1) and a second location (S2) are packages; done points 1 and 6 need them. Terrain and
  fortresses stay out (battles 13-15 are not in WORLD-03's eight).
- Flags 4, 14: "never luck" (done point 8, Phase A done point 5): a decision the vision gives a rule for runs on that
  rule, not a draw. The scuttle becomes BRIDGE §7's timed crisis (N2); B3 replaces pushback draws with BRIDGE §1 trait
  rules. Seeded draws stay for gunnery and noise.
- Flag 5: the enemy admiral is a person aboard the flagship, lost apart from it (VISION §7's two losses): N3.
- Flags 9, 10, 11: Phase C items stop at setup flags (as SCR-B scripted); leading a boarding in person stays
  unscripted; the comms array and couriers stay in EXP-12 s8-9 (BRIDGE §8) at the end of B5's list.
- Flag 17: already filed (`vision/visions/2026-10-21-phase-b-prompt.md`).

## Gaps ranked (wave 3)
1. **contradicts:** the player cannot win (scripted-good withdraws 10/10); a fleet winning on material breaks at 2:35;
   battles last 2–3 min against the reviewed battle 1's 7:30. → PKG-08 (Palamedes).
2. Comms, orders and the flagship crew are sim-only. → PKG-09.
3. Maneuvers don't exist. → PKG-10 (sim; ghost lines on screen in wave 4).
4. No directing camera or PiP. → PKG-11.
5. Wave 4: T1 tactical view (25%, arcs, ghost lines, order lines); title-screen entry and the `skirmish` flag;
   Kalliope: house names ("A Titan house (Saturn)" reads as a placeholder), surname variety (5 of 20 sample speakers
   are Laskaris), flag-lieutenant lines read like a log, the `captured` line reads as a loss when the player captures,
   the fold repeats a line; sim: a standing `shieldPower` order must hold against the flag captain's re-trim (EXP-02 s8),
   a marine-commander Reinforce / Pull back / Carry on decision report (EXP-05 s6), screen and ram maneuvers; look
   (Zeuxis): shield shimmer reads as opaque orange bubbles in close shots, the inset lacks bloom, the HUD covers much
   of the battle at 800 px; fighters (fighter-command orders are stored, not flown).
6. Wave 5 (from TRC-03 and wave 4): enemy-ship click hit radius (~40% miss); why real orders make the fleet worse than
   idle (after fair rosters); R's help line; engine glow as big as small hulls in close shots (PKG-15 request); ship
   name "Kraken" is Norse; Helm tightness on the flanking arc (PKG-12 request); the broadside ghost path dog-legs far
   off; the help line overlaps the maneuver bar at 800 px. Then Q-A (Momus cold vs the six done points and battles 1, 2, 4, 7, 17), fixes, play card.

## Running
| Label | Agent | Model | Branch / worktree | Port | Files held | Started |
|---|---|---|---|---|---|---|
| ~~PKG-16~~ **verified** b994a5d, 554251a | abe3e7db | Opus 5.5 | `claude/pkg-16` | none | `numbers.ts`, `captains.ts`, `checks.ts`, `sim.mjs`, boarding numbers + unordered rule, capture-shock line, policy entry | wave 5 |
| ~~PKG-17~~ **verified** 3a1be08, c9a4bff | a559e832 | Opus 5.5 | `claude/pkg-17` | 5217 | picking code, help line, engine glow, view css | wave 5 |
| ~~PKG-18~~ **verified** 4b38b44, 1216c04 (via PKG-18R) | aad5548b | Opus 5.5 | `claude/pkg-18` | 5218 | `maneuvers/**`, setup ship names | wave 5 |
| ~~SCR-B~~ **verified** dd67af1, merged by Daedalus | a0743b3d | Opus 5.5 | `claude/scr-b` | none | `vision/scripts/**` | 19:27 |
| ~~PKG-18R~~ **done** 4b38b44 | aa0715f0 | Opus 5.5 | `claude/pkg-18` | none | merge only | 19:45 |
| ~~QA-05~~ **done** 2de77e1 (re-landed by Daedalus) | a02e4469 | Opus 5.5 | `claude/qa-05` | 5226 | `qa/WAVE-05.md`, `shots/qa-05/**` | 20:20 |
| ~~TRC-05~~ **done** 54e185a (gate stalled on sleep; docs only, lock cleared by Daedalus) | a19fd390 | Opus 5.5 | `claude/trc-05` | 5225 | `vision/traces/**`, `shots/trc-05/**` | 20:20 |
| ~~PKG-19~~ **verified** 473528b (c3, W01 c6 FAIL held-out, ruled) | aadb44b1 | Opus 5.5 | `claude/pkg-19` | none | `sim.mjs` --from, `policy-good.ts`, `policy-bad.ts`, 2 lines in `policies.ts`, `numbers.ts`, `boarding/numbers.ts`, `vision/sims/**` | 20:20 |
| ~~PKG-20~~ **verified** 06ea20b, 8688737 | a758b3fc | Opus 5.5 | `claude/pkg-20` | 5220 | new `setups/**`, setup registry, `setup` lines in `Skirmish.tsx`, body line in `scene.ts`, `sim.mjs` --setup | 20:20 |
| ~~PKG-21~~ **verified** a04e81b, ac013d7 | affa84d7 | Opus 5.5 | `claude/pkg-21` | 5221 | `flags.ts` skirmish, GameView entry lines, `view/tactical/**`, `director/**`, `camera.ts`, roster/order menu, view css | 21:00 |
| ~~PKG-22~~ **verified** 6949c2f, c25084d | ab2397c3 | Opus 5.5 | `claude/pkg-22` | 5222 | `sim/comms/**`, `view/comms/**`, pods-side line, shield-arc lines | 21:00 |
| ~~PKG-23~~ **verified** 69fd1fa, 5fc0549 | a75875df | Opus 5.5 | `claude/pkg-23` | none | test timeouts/bench, `bench.mjs`, end check in `battle.ts` | 12:15 |
| ~~PKG-24~~ **not merged** (bars fail held-out; branch kept @ b79c115) | a0c0fea0 | Opus 5.5 | `claude/pkg-24` | none | draw lines in `sim/**` (named), `numbers.ts`, `boarding/numbers.ts`, `vision/sims/**` | 12:15 |
| ~~TRC-06~~ **done** 31a09b7, bdbcb27 | a761e67f | Opus 5.5 | `claude/trc-06` | 5236 | `vision/traces/**`, `shots/trc-06/**` | 13:10 |
| ~~PKG-25~~ **verified** 054c1a6, fd433ea | a5fed98f | Opus 5.5 | `claude/pkg-25` | 5225 | `sim/fighters/**`, pdChance line, fighter drawing, admiral fighter lines, flag `fighters` | 13:25 |
| PKG-26 morale N3 (Phase B) | ab715316 | Opus 5.5 | `claude/pkg-26` | 5226 | `sim/morale/**`, battle.ts break/escape lines, boarding capture lines, WORLD-04 rows, spool/strike visuals | 13:25 |
| ~~PKG-12~~ **verified** 96f2f29, fc4e464 | a95098d3 | Opus 5.5 | `claude/pkg-12` | 5212 | `src/battle/view/tactical/**`, T key, order-menu maneuver lines, order lines | wave 4 |
| ~~PKG-13~~ **verified** bdf7203, 67e8c97 | a964c3c3 | Opus 5.5 | `claude/pkg-13` | none | `admiral/**`, roster fn in `captains.ts`, `vision/sims/WORLD-02/**` | wave 4 |
| ~~PKG-14~~ **verified** 25b3008, 54658c3, item 7 86348d3 | a7e8cc90 | Opus 5.5 | `claude/pkg-14` | 5214 | `boarding/**`, `comms/**`, trim fn in `captains.ts`, setup names | wave 4 |
| ~~PKG-15~~ **verified** e84e2ab, c1c0c1f | a700effe | Opus 5.5 | `claude/pkg-15` | 5215 | `scene.ts` shields, view css, director framing, PiP pass, panel layout, F6 test | wave 4 |
| ~~TRC-03~~ **done** 52eb991, f919906 | ae6de751 | Opus 5.5 | `claude/trc-03` (from wave-03) | 5221 | `vision/traces/**` | wave 4 |
| ~~PKG-08~~ **verified** 7772a60, 68fb1a4 | a3a6bb08 | Opus 5.5 | `claude/pkg-08` | none | morale/break code in `battle.ts`, `numbers.ts`, boarding pod counts, `summary.ts`, setup ships | wave 3 |
| ~~PKG-09~~ **verified** 665fc9f, 77275a2 | a70f77c9 | Opus 5.5 | `claude/pkg-09` | 5209 | `src/battle/view/comms/**`, Skirmish key handler, css | wave 3 |
| ~~PKG-10~~ **verified** be3b438, 59681aa | a95bec1e | Opus 5.5 | `claude/pkg-10` | none | `src/battle/sim/maneuvers/**` + rule-9 lines | wave 3 |
| ~~PKG-11~~ **verified** 2180f74, 5c4e71e | aa6f6adc | Opus 5.5 | `claude/pkg-11` | 5211 | `src/battle/view/director/**`, `camera.ts` | wave 3 |
| ~~TRC-02~~ **done** c26ce74, adb62a0 | a8538657 | Opus 5.5 | `claude/trc-02` (from wave-02) | 5220 | `vision/traces/**` | wave 3 |

Not ours: **Wave A: numbers that only go up** (<session>), holds `Shipyard.tsx`, `munitions.ts`, `progression/*`.
Never waited on. Mechanism measured 2026-10-21: agent launches work on wake turns.

## Foundations
F1 probe built (dev only) · F2 battle sim deterministic + runner + lint boundary · F3 deferred (A2; no battle file
over 665 lines) · F4 `src/flags.ts` (skirmish off; skirmish saves nothing) · F5 baseline 131 draw calls / 71,508
tris (PKG-04) · F6 tokens merged with look-unify; raw-colour test not built (wave 4).

## Flags still off
- `skirmish` **on** since PKG-21 (title-screen "Fleet battle")
- `director` and `tactical` are **on** (PKG-11, PKG-12)

## Gemini
Driver: none. Blocked since 2026-10-21 by a Google reCAPTCHA in Caleb's Chrome. Caleb clears it.

## For Caleb (batched into the play card)
1. Phase A is a **separate skirmish mode** (`?skirmish`), not inside the voyage game. Assumed.
2. The battle is at **Saturn's rings, a Saturn house against the House of Ganymede (Jupiter)**. Assumed.
3. The vision documents are untracked in git. Commit them on `claude/game` so they can't be lost?
4. PKG-01 kept two calls you may want back: guns lead a locked ship even if its house holds fire (`2c9006d`); gun
   arc 60° (integration-5's), not eve-controls' 40°.
5. Skirmish hulls keep the voyage game's house colours; the lines are told apart by their lights. Assumed.
6. Captains are a fixed roster per setup; the seed varies the dice, not the people (pillar 8: in the campaign they
   will be generated; in a skirmish the roster is the setup). Assumed.
8. **Pods at their flagship:** VISION.md §7a's crew table says "Send the pods at their flagship"; NAVY-DESIGN.md §3 says only
   the admiral leading in person may board it. Building VISION's reading (it outranks the companion doc). Overrule?
9. **Fair rosters (ruled on):** both sides' captains get equal ability totals and traits per hull class, still varied
   ship by ship; without it a good player won 0 of 30. Overrule?
10. **Phase B runs under the method**, not the prompt's integrator/TEAM-BOARD lines (same as your Phase A scope note). Assumed.
11. **Phase B, four worlds** for the admiral styles: Mars, Jupiter, the Moon, Mercury (your prompt says at least four; VISION §16 says seven; Earth needs fortresses, Saturn cover terrain, Venus agents). Assumed.
12. **Phase B, a wing is a squadron** (NAVY §1 wings = BRIDGE §10 squadrons a commodore commands), and the bridge is one staff of seven roles (VISION §7a and BRIDGE §2 lists merged). Assumed.
13. **"Never luck" (done point 5) failed three packages in a row** (TRC-06 found why: a winning plan loses when its first order lands one frame earlier or later; 8 starts, 2 wins) (PKG-16, PKG-19, PKG-24). Held-out seeds 61-90, bar 24/30: WORLD-02 c3 good beats idle 19 → 19 → 24; c4 bad worse than idle 23 → 23 → 18; WORLD-01 c6 trait swap changes the battle 22 → 22 → 25 (and 22/22 on the other blocks after PKG-24). PKG-24's audit: no single draw is the luck; pin them all and c4 and c6 fall to 0/60, because both checks count seed-by-seed differences, which the sim's chaos supplies. **Recommended:** judge these checks on the 30-seed average (mean outcome rank and ships lost, good vs idle vs bad, with a margin), not per-seed pairs. Changing a measure after seeing results is yours to allow. Until then they stay FAIL and work moves on.
7. Listen to the 20 sample comms lines in `reports/PKG-06.md`: do they sound like people?

## Next
- 2026-10-22 14:10: TRC-06 done (55/65 on 4b5914c; regression WORLD-01 c6 is the held-out judging, For Caleb 13; TRC06-4 one-frame sensitivity added there). PKG-25 verified (054c1a6 + fd433ea; tsc, vitest 77/947, build, Phase A WORLD 10 seeds; smoke on the tip). Tagged `wave-06`. Play card at the top of this board and pushed. Open: TRC06-1 (reinforce goes at a closed side), TRC05-1 (Focus Port), TRC06-2/3 minor, TRC05-7 run after a withdrawn target, PKG-25's enemy screen too strong (88% of pods) -> next fix package. Phase B: PKG-26 running.
- 2026-10-22 13:25: **Phase B wave 1 dispatched:** PKG-25 (F1 fighters; also closes Phase A EXP-02 s10) and PKG-26 (N3 morale). Phase A play card waits on TRC-06 (traces the pinned tip 4b5914c, tag wave-06 there).
- 2026-10-22 13:10: PKG-23 verified (69fd1fa + 5fc0549: test timeouts, bench, 5-line end check; re-run tsc, vitest 74/927 + 1 bench-skipped, bench PASS 1.98 ms, end test, build, smoke, WORLD-01/02 10 seeds). TRC-06 launched on the tip for the play card.
- 2026-10-22 13:20: PKG-24 not merged: held-out c3 24, c4 18, W01 c6 25 (and 22/22 on 1-60), new WORLD-01 c1 timeout. Third failure on the same bars -> For Caleb 13 (method step 6); no fourth attempt. Its rule replacements (scuttle fuse BRIDGE §7, refusal §6, candour §3, marine Judgement §2, deliberate admiral mistakes VISION §9) return in Phase B N2/B3/AI2 from branch claude/pkg-24. Next: PKG-23 verify, then TRC-06 + play card.
- 2026-10-22 12:35: PKG-20, PKG-21, PKG-22 verified (gate re-run on ac013d7: tsc, vitest 73/925, build, smoke PASS). Fleet battle on the title screen (shot opened); skirmish flag on. Running: PKG-23, PKG-24. Next: TRC-06 rescore after both merge, then the play card. Phase B N2/N3/F1 wait for PKG-24 (balance). Open: TRC05-1 (Focus Port lands on the aft), TRC05-7 pods not launching on a boarding run (maneuvers sim) -> next sim package. Could not open the build live on 2026-10-22 12:25: the app refused a 6th dev server for this folder (5 held by other chats); re-test costs 1 call once one is free.
- 2026-10-22 12:15: PKG-19 verified (473528b; re-run: c3 29/25/19, c4 27/24/24, W01 c6 29/23/22 on blocks 1/31/61): ruled merged with c3 and W01 c6 scored FAIL on held-out seeds; cause = luck share -> PKG-24 luck audit. PKG-20 merged (06ea20b, 8688737; 19 setups at six bodies). PKG-22 merged (6949c2f, c25084d; done point 4 by the player's own order, seed 1). PKG-20 and PKG-22 verifying. Lock incident (PKG-19 took a live lock) and the sleep -> A10. Launched PKG-23, PKG-24.
- 2026-10-22 02:25: **TRC-05: 56/65 (wave-03 39/65)**; one regression, WORLD-02 c3 59/90 at held-out seeds: a stricter measure (A8), not code; PKG-19 owns it. Tagged `wave-05` = 54e185a (code = ad81038). EXP-03 3b broadside confirmed parallel by eye. TRC05-1 (Focus Port lands on the aft) -> next sim package. **Hard stop found:** the machine slept ~21:15-01:20 (keep-awake ends when this session idles while agents work); PKG-21 and TRC-05 streams stalled; TRC-05's lock cleared (docs-only merge); PKG-21 resumed; a 12 h keep-awake request process now runs (pid 25324).
- 2026-10-21 21:00: QA-05 routed: F-01 ruled BLOCKER (title entry, skirmish flag on) + input fixes -> PKG-21; F-03, F-04, F-07..F-10, F-14 -> PKG-22; F-06 + load-proof tests -> PKG-23 (written, dispatch when a slot frees: 6 agents at once loads the gate); F-02 -> PKG-19 then re-check by sim; F-16 delegation -> Phase B B5 (flag lieutenant); F-17 no build-up -> feel check for Caleb.
- 2026-10-21 20:20: **Wave 5 merged and verified** (PKG-16, PKG-17, PKG-18 via PKG-18R). PKG-16's WORLD-02 c3 holds only on its tuning seeds (24/30 on 1-30, 59/90 on 1-90; WORLD-01 c6 23 and 22 on fresh blocks): amendment A8 (judge tuned numbers on held-out seeds) and PKG-19 (a vision-defined good plan, written before measuring). Dispatched: QA-05, TRC-05 (folds wave 4, A5; WORLD at 10/30/90 seeds), PKG-19, PKG-20 (Phase B S2, collides with nothing). Tag `wave-05` after TRC-05 shows no regression. Then fixes (Q-A top 5, PKG-16/17 requests: off-screen enemy orders, escort-off-screen warning), the play card, then Phase B F1 after PKG-19.
- 2026-10-21 19:30: Handover: Caleb asked for a new Daedalus thread; the new session owns the loop; the old session (<session>) only forwards wave-5 agents' final messages.
- 2026-10-21 19:30: **Phase B received** (Caleb pasted `Work\PROMPT-daedalus-phase-b.md`; filed as `vision/visions/2026-10-21-phase-b-prompt.md`). Run under the method's process, as with Phase A (assumed, For Caleb 10). Its own rule: Phase A not done, so write scripts and packages now and start only what doesn't collide. SCR-B (scripts + code inventory, branch `claude/scr-b`, no merge) running. Phase B build packages go out after wave 5 merges; Phase A (wave 5, Q-A, TRC-05, play card) keeps priority.
- 2026-10-21 19:30: PKG-18 gate failed twice (reverts 98fc43c, e6e87f5); both failures were timeouts in `hardpoints.test.ts` (not its files) under load: a gate fault, not a package failure (A7: gate now `vitest --maxWorkers=4`). PKG-18R re-merges it under A7.
Wave 5 dispatched: PKG-16 decisions matter (Palamedes: fair rosters on, 30-seed bars, why playing is worse than idle), PKG-17 view polish (picking, help line, glow), PKG-18 maneuver fixes (Helm tightness, broadside path, ship names). Then Q-A (Momus cold vs the six done points and battles 1, 2, 4, 7, 17) and TRC-05, then the play card.

## Next (wave 4)
Wave 4 dispatched: PKG-12 tactical view, PKG-13 admiral + fair rosters, PKG-14 bridge fixes (+ Kalliope names), PKG-15 look pass, TRC-03 rescore of `wave-03`. Then wave 5: Q-A (Momus cold play) and the play card.

## Next (older)
Wave 3 dispatched: PKG-08 morale balance, PKG-09 comms UI, PKG-10 maneuvers sim, PKG-11 director camera, TRC-02
rescore of `wave-02`. On each wake: verify (method step 6) in the verify worktree, update this board.
