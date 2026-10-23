# PKG-22-comms-clarity
Label: PKG-22 · Kind / seat: build / Talos with Kalliope for lines (read `<local>`,
`kalliope.md`) · Base: `claude/game` @ <launch tip> · Port: 5222 at `http://[::1]:5222/?skirmish` · Worktree `pkg-22`

Makes these pass: Phase A done point 4 by the player (open a side, board, capture), EXP-05 steps on open sides and
captures, EXP-02 one-key answers. Read first: `qa/WAVE-05.md` (QA-05, Momus cold play on ad81038; findings by number, repro steps, shots in `shots/qa-05/`). Each finding below must be re-played through the real UI after your fix, at 1280 and 800 (375 where named), with a before and after screenshot.

## Do
1. **F-03** an officer reports when an enemy side is open (master of guns or sensor officer: "Their port side is
   down", on the ship the guns are on and on any ship the player has selected), as a report the player can act on with
   one key ("Send the pods" / "Keep firing"); the pods go at the open side. In the tactical view the shield arcs read at
   1280 (size and contrast; Zeuxis's tokens). Battles 1 and 4 in `battle-sims/01-17-reviewed-with-caleb.md` are the
   models (read only those two).
2. **F-04** a key answers the highlighted card, every time; a press that cannot act says why. Keep PKG-09's key rules
   (R answers a third option when one exists) unless they cause the misses: then rule it in the report.
3. **F-07** a capture is announced both ways as a card the player can't miss ("Pnyx is taken", "Herald is ours"); the
   scoreboard explains `12/13` (e.g. "11 + 1 taken").
4. **F-08** answers match the request (a "request we turn" offers "Turn"; "boarders inbound" offers "Fighters to her").
5. **F-09** one captain never has two live cards that contradict; the newer one replaces or merges the older.
6. **F-10** no internal names in the log (`shieldPower`); **F-14** an officer whose ship is gone stops reporting.

Files you own: `src/battle/sim/comms/**`, `src/battle/view/comms/**`, the pods-side line in `src/battle/sim/boarding/**`
(name it), the shield-arc drawing in `src/battle/view/tactical/**` (name the lines; PKG-21 holds the rest of
tactical), `scene.ts` shield lines only if the arcs live there (name them), tests, `shots/pkg-22/**`.
Must not touch: `numbers.ts`, `policies.ts`, `policy-*.ts` (PKG-19), `setups/**` (PKG-20), the rest of `view/**`
(PKG-21).
Flag: none. Save: unchanged.
Acceptance: tsc; `npx vitest run --maxWorkers=4`; lint; build; smoke; WORLD-01/02 at `--seeds 10` no worse than the tip
(paste before and after); each finding re-played; one full battle where the player opens a side and captures a ship
by his own order (seed and clicks in the report). Report `reports/PKG-22.md`.
