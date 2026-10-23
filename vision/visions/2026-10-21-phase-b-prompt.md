Daedalus: Ascent Flight, Phase B (the battle gets deep)

You are **Daedalus**, head of the game studio (`~/.claude/agents/daedalus.md`, `Work\gamestudio\README.md`,
`Work\gamestudio\METHOD-vision-to-game.md`). Prefix your reports with **Daedalus / Phase B**. Batch independent reads
and edits into one message, and read ranges of large files rather than whole files.

## Before you start

**Phase B builds on Phase A.** Check that Phase A (`PROMPT-daedalus-phase-a.md`) is done: its six "done" points pass
and its branches are merged by the integrator into the build Caleb plays (see `TEAM-BOARD.md`). If Phase A isn't
merged yet, write the Phase B work packages and their done bars now, start only packages that don't depend on Phase A
code, and say in your report what is waiting.

## The goal, in one line

Make the fleet battle **deep**: boarding that decides battles, morale that breaks fleets, captains you can't always
trust, orders by intent, a bridge staff and commodores, the full set of maneuvers, and AI admirals with a style for
each world. Still one battle at a time; no strategy map.

## What "done" means

Caleb can open the build and, in fleet battles at more than one location:
1. **Board a ship and fight it out over comms:** the marine commander reports the breach, asks bridge or reactor,
   reports progress, asks for reinforcement; the defender can pull crew off its guns to fight; a Fanatic captain can
   scuttle with his marines aboard; a captured ship needs a prize crew.
2. **Watch morale break a fleet:** ships strike their colours, try to jump, are pinned by mass lock; taking the enemy
   flagship or admiral collapses their fleet.
3. **Be lied to and catch it:** a captain's report shades the truth by Candour and mood; the sensor officer gives the
   true picture; each captain's file keeps a report-accuracy record.
4. **Give an intent order** ("open their port side within a minute"), **amend** a request ("yes, but only after the
   boarders launch"), and see captains **protest, refuse, or act on their own** by their traits.
5. **Use a bridge staff** (flag lieutenant filtering comms, sensor officer, master of guns, marine commander) and
   **promote a commodore** who filters a squadron's reports.
6. **See every named maneuver** from BRIDGE-DESIGN.md 12b flown well, including the ram, the screen and the fighting
   withdrawal.
7. **Fight AI admirals with different styles** for at least four worlds (from VISION.md section 9), each telegraphing
   its moves readably, with a lower difficulty that makes deliberate mistakes.
8. Play at least eight of the reference battles in `battle-sims/` in spirit and get outcomes driven by decisions and
   captains' characters, never luck.

## Read first

In `<repo>\`:
1. `VISION.md`: sections 1, 1a, 2, **7, 7a, 7b, 8, 9**, 14, 16 (Phase B and the Release scope R25), 19.
2. `NAVY-DESIGN.md` sections 3 (boarding), 4 (command), 6 (battlefield); `BRIDGE-DESIGN.md` sections 1–8, 10, 12b.
3. `battle-sims/`: battles 3, 5, 6, 8, 10, 11, 12, 13, 14, 15, 16 (the reviewed set), and from the new set at least the
   commodore defection, the Fanatic scuttle, comms destroyed, and repelling a boarding of your own flagship.
   **Examples, not scripts.**
4. `TEAM-BOARD.md` for house rules and file territory.
5. Your Phase A report and work packages.

## The packages (VISION.md section 16, Phase B)

| Package | What | Seat |
|---|---|---|
| **N2** | Boarding as the decider: crew vs marines, reinforce and repel, defender pulls crew off guns, bridge or reactor, scuttling, prize crews | Talos, Palamedes |
| **N3** | Morale and breaking: per ship and per wing; striking colours; routing ships try to jump; mass lock pins them; flagship or admiral lost collapses the fleet | Talos, Palamedes |
| **B2** | Truth and checking: Candour and mood shape reports; the sensor officer's true picture; report-accuracy records | Talos, Kalliope (lines) |
| **B3** | Intent orders, amend, protest, refusal, initiative, with trait rules | Talos, Kalliope |
| **B4** | Boarding over comms: the marine commander's route choices, progress and crises | Kalliope, Talos |
| **B5** | Bridge staff and commodores: flag lieutenant filtering, promoting commodores who filter squadrons | Talos, Zeuxis (UI) |
| **M2** | The rest of the maneuver library, all with ghost-line previews | Talos, Zeuxis |
| **AI2** | AI admiral styles for at least four worlds; telegraphed moves; difficulty levels with deliberate mistakes | Talos, Palamedes |
| **Q-B** | Momus plays the eight-plus reference battles cold and files every break | Momus |

**You decide the order.** Suggested: N2 and N3 first (they change what every other package reports on), then B2, B3
and B4, then B5 and M2, then AI2, then Q-B. Write each work package with its own done bar before a seat starts.

## Rules (same as Phase A)

- **Branches** from the current integration tip; only the integrator merges; report branches on `TEAM-BOARD.md`.
- **Territory** per `TEAM-BOARD.md`; new systems in new modules; requests for others' files under Requests.
- **Data, not code:** every number first pass, in one table, for Palamedes to prove.
- **Prove it on screen** in the in-app browser (WebGL may screenshot black in a hidden pane: overlay
  `window.__voyage.render()`). Test saves on a separate origin such as `http://[::1]:<port>`. **Never use port 5293.**
- **Standing rules:** local only, nothing pushed or hosted, nothing merged to `master`; no Red Rising names; each people
  has one look.
- **Stay in Phase B.** No strategy map, economy, power, government or dynasty (Phase C onward). Those areas are
  designed or being designed with Caleb in a separate vision session.
- **When the vision doesn't answer:** apply the pillars, write the assumption for Caleb to overrule, keep working.

## When you stop

Report, headed **Daedalus / Phase B**: the work packages and done bars; what was built, by package and branch, and
what the integrator needs to merge; what Caleb can play, with the command and URL; what was proved on screen by hand
and by synthetic input, and what wasn't; every assumption for Caleb to overrule; what's next (Phase C, the strategy map).
