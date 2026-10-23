# QA-05: Phase A cold play (Momus)

**Build:** branch `claude/qa-05` at launch tip `ad81038`, dev server `npx vite --port 5226 --strictPort --host ::1`,
opened at `http://[::1]:5226/?skirmish`. Played 2026-10-21, roughly 19:55 to 20:40 (about 45 minutes).
**Played:** four full battles at 1280x800 (two where I gave orders, two where I touched nothing), plus a boot and
first-reports pass at 800x600 and at 375x812.
**Method:** I used real mouse clicks and key presses through the UI. The Browser pane was hidden for the whole
session, so `requestAnimationFrame` was paused and I moved game time with `window.__probe.advance()`, as the package
allows. I used the probe to read the flag list and `errors()`, and nothing else.
**Would I hand this to a first-time player today: no.** In four battles I did not win once. I could not capture a
ship myself. And there is no way to reach the battle from the title screen.

Evidence labels: every finding is MEASURED-HERE (I saw it on screen this session) unless it says TASTE.

## Not exercised

- **Cutting the network.** I had no control for it. What I did measure: all 250 resources the page loaded came from
  `[::1]:5226`, and none came from an outside host (`performance.getEntriesByType('resource')`). That is evidence the
  game should run offline, but I did not prove it by going offline.
- **Two tabs and save/reload.** The skirmish has no save. A refresh mid-battle restarts it at 0:00 (seen on every
  reload). I did not open a second tab.
- **Real-time pacing at 1x.** Every timing below is in game seconds stepped by the probe. I did not measure how long
  a decision timer feels in real time with the pane visible.
- **Picture-in-picture.** I did not see it in any of the 23 screenshots. It may exist; I never caught it.
- **Visual check at 800 and 375.** At device pixel ratio 1.25 the harness crops screenshots to the top-left of the
  viewport (`20-…`, `21-…`), so I checked layout from DOM geometry instead. At both widths nothing overflowed
  (`scrollWidth` 800 and 375), and the crew panel sat at x 634–779 of 800.
- **Seeds.** I found no seed in the UI or the URL. With identical input (none), two do-nothing runs ended
  differently: DEFEAT at 6:17 and DEFEAT at 4:01. Repro steps below give a time and clicks but no seed.

## The six "done" points (`vision/visions/2026-10-21-phase-a-prompt.md`)

| # | Done point | Verdict | What I did and saw |
|---|---|---|---|
| 1 | 12-v-12 at one body | **met** | Saturn's rings. The scoreboard reads `House of Kleisthenes 12/12`, `House of Ganymede 12/12` (`01-boot-1280.jpg`). Reached only through `?skirmish` (F-01). |
| 2 | Command only through captains and the tactical view: comms queue, one-key answers, direct ship orders, flagship crew orders | **partly** | Reports arrive in a queue. Q/E/R answer the selected card and Tab moves to the next. The crew panel gives Flag captain (Close, Open range, Fresh side, Cross their bow, Hold station, Ram), Master of guns (Guns on…, Hold fire), Shields (Fore/Aft/Port/Stbd, Even, All-x, Overload guns, Feed engines), Marine commander (Pods at <target>) and Fighter command (Escort, Screen, Hunt). A ship in the roster or the tactical view gives Hold, Follow flagship, Withdraw, Status? and six maneuvers. All of it is there. What falls short is that keys and commits did not always land (F-04, F-05), and the answer choices don't match the requests (F-08). |
| 3 | Battle plays like a film: directing camera, cuts, own camera, PiP | **partly** | The director cut on its own from the wide Saturn shot to close hull shots (`23-375px-director-closeup-0023.jpg`, and the close shot after pressing T in run 1). T opens a slowed tactical hologram, and drag turns the view. I never saw PiP. In run 3 the camera dropped to a low angle and R did not bring it back (F-11). |
| 4 | Open a shield side, board an enemy ship, capture it | **not met (by me)** | I tried three times: Pods at Ganymede at 0:29 (run 1), Pods at Herald at 0:40 (run 4), and a Boarding run by Agora at 1:48 (run 4). The pods were turned back twice (*"Pods turned away at Ganymede. Her fore shield is still up."*, *"Pods could not get through Herald's fore shield."*), and the boarding run never committed (F-05). AI captains did capture ships: my side's debrief shows `Captured 1` in runs 2 and 4. Capture works in the sim, but I could not do it myself as the player (F-03). |
| 5 | Break the enemy's morale and win or lose, decided by decisions and captains, never luck | **partly** | Losing works, with an honest debrief: *"House of Kleisthenes broke at 6:05: fleet morale 24"* (`12-…`). Winning I never saw, in 4 of 4 runs (F-02). On luck: two identical do-nothing runs gave different results (Ganymede lost 1 ship vs 0, and the battle ran 6:17 vs 4:01), so chance has a visible share. |
| 6 | Do nothing and still watch a battle decided by captains' traits and standing orders | **met** | Runs 2 and 3: no input at all, and both played to a DEFEAT screen. Captains acted on their own and in character: *"No reply from the flagship. Carrying on. Should have asked sooner."*, *"Nobody is answering. Pulling out."*, *"No orders. We stand. I was not going to sit here."* Battle 2 says a passive admiral should lose ground but not everything. Here he loses everything (F-02). |

## Reference battles: did the game let me do what the admiral did?

| Battle | What I tried | Did it let me? | Was the outcome mine? |
|---|---|---|---|
| **1** (played well) | Approved a captain's request (Reinforce port, Ekklesia, 0:06; reply *"Power to port. Ekklesia out."*). Guns on their flagship (0:25, *"All batteries on Ganymede. Firing."*). Fighters to Screen (*"Wings will screen."*). Pods at their flagship. | Mostly. There is no "send our marines across" to save a friendly ship that has been boarded. The only answers to *"Breach on Pnyx. Their marines are aboard."* are Carry on / Fall back / Escorts close up. Pnyx was taken at about 1:30 in 3 of 3 runs where I watched for it. Nothing like "Her port side is at 20%" ever reached me. | No. I lost 0/11 to 12/13, with the enemy losing nothing (run 1). |
| **2** (do nothing) | Two runs with no input. | Yes. | The captains decided it, and in character. But both runs ended in total rout, which is harsher than battle 2's "loses ground but not everything". |
| **4** (launch early, pod deflected) | Launched pods with no gunnery report that the shield was down. | Yes. The pods were turned back off a fore shield, and the game told me why. | Yes, that slip was mine. But nobody ever reported "bow shield's down", so I could never have waited for the right moment (F-03). I never saw marines lost or a pod spinning off on screen. The only record was a line inside a sensor summary. |
| **7** (delegate, then fly and board yourself) | Cross their bow (*"Crossing their bow, aye. Bringing her round."*). Flanking arc on Agora (*"Aye, Admiral. Maneuvering on Amalthea."*). | Partly. I found no intents, no commodore, no "boarding on" standing order, no flag lieutenant to take the comms queue, and no way to board in person. Without those I could not delegate, so I answered a report every 3–8 game seconds myself. | No. |
| **17** (ambush, fleet wheels as one) | Tactical view at 25% time. Defensive wheel is in the maneuver list, and the picker says *"click your ships to add or drop them"*. | Partly. A multi-ship maneuver looks possible, but I did not get one committed. The battle has no ambush or opening phase: both fleets open fire at 0:00 and 0:01. | Not tested to the end. |

## Findings

Severity follows the package: BLOCKER / MAJOR / MINOR. UNFUN is the Momus seat's extra category. Width is 1280 unless
it says otherwise.

**F-01 · BLOCKER · A first-time player cannot find the battle.**
Steps: open `http://[::1]:5226/`. The title screen offers *New game*, *Peoples of the System*, *Settings*, and
nothing else. The battle loads only at `?skirmish`. The flag list says why: `skirmish … on: false` ("Off: no
title-screen entry"). Expected: Done point 1 says "Caleb can open the build and fight". A player who doesn't know the
URL never sees Phase A. Width: all.

**F-02 · BLOCKER · I lost every battle, and doing nothing loses as badly as playing.**
Steps: open `?skirmish`. Run 1: I answered most reports, put guns on Ganymede, sent fighters to Screen and ordered
Cross their bow. Result: my fleet 0/11, theirs 12/13, enemy losses zero, and the battle still running at 6:45
(`11-…`). Run 2: no input. DEFEAT at 6:17 (`12-…`). Run 3: no input. DEFEAT at 4:01, with Ganymede losing nothing.
Run 4: active play. DEFEAT at 5:07, my fleet 0/12, theirs 9/12 (`19-…`).
Expected: battles 1, 4, 7 and 17 all show a well-played fleet winning, and battle 2 shows a passive fleet still
saving most of its convoy. Here the player's side breaks at fleet morale 24–25 every time, and nothing I found
changes that. TASTE: a mirror-match 12 v 12 where the AI side always wins makes the player's decisions feel
worthless. For Palamedes to check by sim.

**F-03 · MAJOR · A first-time player has no way to tell when an enemy shield side is open, so boarding is guesswork.**
Steps: run 4. At 0:03, Guns on Herald (*"Guns on Herald, aye."*). Over the next 37 game seconds the master of guns
never reports a shield state. At 0:40, Pods at Herald. Result: *"Pods could not get through Herald's fore shield."*
Run 1 went the same way with Ganymede at 0:29. The enemy shield arcs in the tactical view are a few pixels at 1280 and
can't be read (`17-…`). The marine button aims only at the current gun target, and there is no way to choose which
side the pods hit. Expected: battle 1 at 4:00 (*"Their bow is open."*) and battle 4 (*"Bow shield's down now."*) both
have an officer who says when a side is open.

**F-04 · MAJOR · A one-key answer can go to a card I hadn't read, and a key press sometimes does nothing.**
Steps, run 3:
- At 0:44 Stoa's DECISION was on top. I pressed Q, and the reply came from a different officer: *"Aurelia Angelos ·
  Astu: Understood. Carrying on."* Stoa's card was still waiting.
- At 1:16 I pressed R on Ekklesia's URGENT card. The card stayed (`14-…`). A second R answered it.
- At 1:44 I pressed Q on Agora's DECISION. The card stayed (`15-…`), and Agora broke while I was answering it.

The hint bar switches between *"R resets the view"* and *"R answers the selected report"*, so R does two jobs.
Expected: the key answers the card that is highlighted, every time. Caveat: one of these misses may be the harness's
key focus. I could not tell them apart from the page.

**F-05 · MAJOR · The Boarding run maneuver would not commit.**
Steps: run 4 at 1:48. Click Agora in the roster, click *Boarding run*, click Herald. The bar reads *"Boarding run ·
Agora → Herald"*. Press Enter, then click *Commit ⏎*. Neither committed. The picker bar stayed on screen for the
next 3 minutes and was still visible behind the DEFEAT panel (`19-…`). In run 3, Enter did commit a Flanking arc.
Expected: Commit commits.

**F-06 · MAJOR · The battle didn't end with my whole fleet gone.**
Steps: run 1, active play as above. By 4:16 my fleet showed 0/11. At 5:44 and again at 6:45 there was no
end screen. The clock kept running, Ekklesia showed *"Running"*, and the crew panel read *"The flagship is gone."*
(`11-…`). The do-nothing runs ended about 12 s after the break. Seen in 1 of 4 runs.
Expected: a DEFEAT screen once the fleet has broken.

**F-07 · MAJOR · My ship was captured and I wasn't clearly told.**
Steps: run 1 or run 4, no special input. Around 1:30–1:40 Pnyx drops out of my roster. My total goes from 12 to 11
and theirs from 12 to 13 (`10-…`). The only messages I caught were *"We lost the decks on Pnyx. She is taken."*
(run 4) and nothing in run 1, where I sampled every 5 s. Expected: battle 1's *"Tanker three is ours"* level of
clarity both ways. A "Prize taken" or "Struck" card would do. The scoreboard format `12/13` doesn't explain itself
to a first-time player either.

**F-08 · MINOR · The answer buttons don't match what the captain asked for.**
Steps: run 3 at 0:44. *"Port side is open. We can turn a fresh side. Request we turn."* The options are *Reinforce
port / Carry on / Fall back on the flagship*, and there is no "turn". In run 1 the urgent *"Boarders inbound on
Ekklesia"* offers only *Carry on / Fall back on the flagship*, with no "fighters to Ekklesia".
Expected: the answers match the request (battle 1 at 1:40, "roll and show its other side").

**F-09 · MINOR · The same captain sends two cards that contradict each other.**
Steps: run 1 at 1:26. Pnyx URGENT: *"We have lost the guns. Hull 44%."* At the same moment, Pnyx DECISION: *"Pnyx
at 35% hull. Request permission to withdraw."* I answered the second with R (fall back). The first then timed out
with *"No reply from the flagship. Carrying on."* (`09-…`). The player can't tell which order Pnyx is following.

**F-10 · MINOR · An internal name shows up in the battle log.**
Steps: at 0:06, approve Ekklesia's *Reinforce port*. The log line reads `0:06 Ekklesia: aye, shieldPower`.

**F-11 · MINOR · The camera tilted low and R didn't reset it.**
Steps: run 3, tactical open. Around 1:44 the view dropped to a low, edge-on angle without any drag from me
(`15-…`). Pressing R at 1:46 left it there (`16-…`). The hologram is hard to read at that angle.

**F-12 · MINOR · Clicking a ship takes precision, and a miss gives no feedback.**
Steps: run 1 at 0:22. Click *Guns on…*, then click the enemy flagship icon about 20 px off its centre. Nothing
happens (`06-…`). A second, centred click works (*"All batteries on Ganymede. Firing."*). *"Guns on…"* also gives
no visible armed state.

**F-13 · MINOR · The roster reflows when a ship leaves, so a remembered click picks the wrong ship.**
Steps: run 4 at 1:48, after Pnyx was taken. Click where Bema's card was (x 255). That now selects Agora (`18-…`). In
run 3 the bar showed Bema selected, but the Flanking arc opened for Agora.

**F-14 · MINOR · The sensor officer keeps reporting after his ship is gone.**
Steps: run 1 after 4:16. *"No signal from Astu."* is followed by more *"Isaac Melissenos · Astu"* status summaries.

**F-15 · MINOR (375) · There's no way into the tactical view on a phone.**
Steps: set 375x812 and open `?skirmish`. The buttons are the answer buttons, Fleet, the crew roles and the ship
cards. I found no Tactical button, and the page text never mentions "tactical". T is a keyboard key. Width: 375.

**F-16 · UNFUN · The comms queue is mostly the same shield question.**
TASTE. From 0:44 to 1:43 in run 3 I answered *"Lost the X shield. Reinforce?"* or *"about to break"* roughly every
4 game seconds. There is no flag lieutenant or standing order to take them off my hands (battle 7). It's busywork,
not decisions, and it crowds out the moments that matter, like an open enemy side or a ship being boarded.

**F-17 · UNFUN · The battle starts with no build-up.**
TASTE. Both fleets open fire at 0:00 and 0:01, and the first decision arrives at 0:06. Every reference battle opens
on a quiet wide shot and a contact report (battle 1, 0:00–0:20). Here there is no scene-setting before the queue
fills.

Console: no errors in any run (`read_console_messages`, `__probe.errors()` → `[]`).

## Top 5: what most stops a first-time player from enjoying a battle

1. **F-02:** you always lose, whatever you do. Nothing teaches you that your decisions mattered.
2. **F-01:** the battle isn't on the title screen.
3. **F-03:** nobody tells you when an enemy side is open, so boarding (the payoff move in battles 1, 4, 7 and 17)
   is guesswork, and it failed 2 of 2 times for me.
4. **F-04 / F-05:** answers and commits don't reliably land on what you meant.
5. **F-16:** the comms queue is a stream of shield-reinforce prompts, and there are no delegation tools to quiet it.

## Requests (for Daedalus to route; I fix nothing)

- Daedalus: rule on whether F-01 is a BLOCKER while the `skirmish` flag waits for acceptance.
- Palamedes: run the do-nothing and the "guns on flagship + screen" policies by sim, and check whether the player's
  side loses every time (F-02).
- Talos/UI owner: F-04, F-05, F-06, F-13.
- Kalliope: F-08, F-09, F-10, F-14.

## Assumed, for Caleb to overrule

- I treated the `?skirmish` URL as the build under test, even though its flag is off.
- I counted the AI captains' captures (`Captured 1`) as evidence that the capture mechanic works, but not as "met"
  for done point 4, which says *Caleb* boards and captures.

## Evidence

Screenshots: `shots/qa-05/01-…` to `23-…` (23 files). Saved from the harness's 800x500 frame of a 1280x800 viewport,
except 20–23.
