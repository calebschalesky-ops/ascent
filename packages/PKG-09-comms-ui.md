# PKG-09-comms-ui
Label: PKG-09 · Kind / seat: build / Talos, with Zeuxis's eye for the panel (read
`<local>`, `zeuxis.md`) · Base: claude/game @ <launch prompt> · Port: 5209 at
`http://[::1]:5209/` · Worktree `pkg-09`

Makes these steps pass on screen: EXP-02 steps 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12 (step 9 needs maneuvers: show the
helm order and its acknowledgement, and report step 9 wired-but-unproven); EXP-05 steps 1, 3, 4, 5, 6, 7 played
through the UI (the sim already does them: `reports/PKG-05.md`); EXP-06 steps 2–3 seen through reports.
Scripts: `vision/scripts/EXP-02.md`, `EXP-05.md`, `EXP-06.md`. Read first: `reports/PKG-06.md` (the queue API:
`queue()`, `answerTop()`, `tabNext()`, `ping()`, officer order kinds, command points; sample lines) and
`reports/PKG-04.md` (the view, `simFeed`, the probe's `act('order')`).

Vision: BRIDGE-DESIGN.md §4 (the queue on the left: portrait, name, ship, house colour, mood; three levels; Q/E/R pick
the top report's answers; Tab moves down; click a captain's portrait in the roster strip along the bottom to give an
order first), §12 (the screen); VISION.md §7a "You command efficiently while you watch" and the flagship crew table.
Absolute path `<repo>\`.

## Build, in `src/battle/view/comms/**` (new)
- **The comms queue panel** (left): urgent red with a sound cue hook (no audio asset: a stub `cue('urgent')`),
  decision amber with its 2–3 answers and their keys and a timeout bar, status grey folded into the flag lieutenant's
  line. Portrait: a code-drawn placeholder per captain (initials on the house colour); painted portraits are later.
- **Keys:** Q / E / R answer the top report; Tab moves the focus down; these call PKG-06's functions. Bind them in the
  existing key handler in `Skirmish.tsx` (you own that handler this wave). No other key in it changes.
- **The roster strip** (bottom): one card per own ship (captain initials, ship name, class, mood colour, a status
  word as his captain last reported it: reports can be wrong, never the true number). Click selects.
- **Direct orders:** with a ship selected, click an enemy ship in the scene (raycast against the scene's ship meshes:
  read them from `scene.ts` through an exported lookup you may add as one line) and pick an order from a small radial
  or list: attack, focus a side (fore/aft/port/starboard), hold, follow flagship, withdraw, board (if it has pods).
  An order line is drawn from ship to target in the scene while it stands (thin, house colour). The order goes
  through `order()`; refusals and protests appear in the queue.
- **The flagship's crew panel:** five officers (flag captain/helm, master of guns, shields and engineering, marine
  commander, fighter command) with their orders as buttons; guns-on and pods need a target (click an enemy). Shield
  power as a four-way split control. Officers answer in the queue in person.
- **Command points meter**, with the cost of the order under the cursor; refusal for lack of points shows its reason.
- **Ping:** right-click a roster card → "Status?" → a Candour-shaped answer.
- **Only the flagship is flown by hand later;** nothing here steers another ship directly (EXP-02 step 11).
- Legible at 375 px: the queue and the top answer keys at least; the rest may collapse behind a toggle.
- Probe: `act('answer', {i})`, `act('select', {ship})`, `act('orderUI', {...})` route through the same handlers.

Files you own: `src/battle/view/comms/**`, the key handler block in `src/battle/view/Skirmish.tsx` and mount lines
there, `src/battle/view/skirmish.css` additions (tokens only), one exported lookup line in `scene.ts`,
`shots/pkg-09/**`.
Must not touch: `src/battle/view/camera.ts` and new director files (PKG-11, running), `src/battle/sim/**` (PKG-08,
PKG-10 running), everything else. If you need a sim change, write it under Requests.
Flag: `skirmish` stays off. Save shape: unchanged. Bench: within +15% of 131 draw calls / 71,508 triangles.
Assumed, for Caleb to overrule: panel layout; placeholder portraits; right-click for ping.
You cannot prove: "a meaningful order every few seconds without taking his eyes off the battle" (feel check).
Acceptance: tsc; vitest; lint (your files); build; smoke. Browser `http://[::1]:5209/?skirmish&probe`: every step
above played through the UI (real clicks and keys; synthetic `KeyboardEvent` for Tab if the harness drops it), each
with a screenshot; EXP-05 on seed 5. Report `reports/PKG-09.md`.
