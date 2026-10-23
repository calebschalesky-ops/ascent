# QA-05-cold-play
Label: QA-05 · Kind / seat: qa / **Momus** (read `<local>` and the `tear-it-apart`
skill `<local>`) · Base: `claude/game` @ <launch tip> (branch
`claude/qa-05`) · Port: 5226 at `http://[::1]:5226/?skirmish`

Play Phase A cold, as a first-time player who has never read a script, report or line of code. You write only
`qa/WAVE-05.md` and `shots/qa-05/**`. You fix nothing.

1. Judge it against the six "done" points in `vision/visions/2026-10-21-phase-a-prompt.md` ("What done means"). For
   each: met / partly / not met, with what you did and saw.
2. Play the spirit of reference battles 1, 2, 4, 7 and 17 from `<repo>\battle-sims\01-17-reviewed-with-caleb.md`
   (read only those battles; examples, not scripts): try what each battle's admiral did, at least once each, and say
   whether the game let you, and whether the outcome came from your decisions and your captains, not luck.
3. File every break, dead end, unclear instruction and unfun stretch: severity (BLOCKER / MAJOR / MINOR), exact repro
   (seed, time, clicks), screenshot path. At 1280 and 800 px; one pass at 375.
4. End with your top 5, ranked by what most stops a first-time player from enjoying a battle.
Never use port 5293. Real mouse clicks through the UI; the probe only to step time when the pane is hidden. Commit on
`claude/qa-05` and merge through the lock and gate (`HOUSE-RULES.md` rule 4; your diff is `qa/` and `shots/` only).
