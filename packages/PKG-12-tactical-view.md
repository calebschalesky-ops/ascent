# PKG-12-tactical-view
Label: PKG-12 · Kind / seat: build / Zeuxis with Talos (read `<local>`, `talos.md`) ·
Base: claude/game @ <launch prompt> · Port: 5212 at `http://[::1]:5212/` · Worktree `pkg-12`

Makes these steps pass on screen: EXP-03 steps 1–9 (the sim half of 3–7 exists: `reports/PKG-10.md`,
`previewManeuver()`); EXP-05 step 1's "seen as the arc in the tactical view". Script `vision/scripts/EXP-03.md`.
Read first: `reports/PKG-10.md` (maneuver API, `maneuver` order kind), `reports/PKG-09.md` (selection, the order menu,
order lines), `reports/PKG-04.md` (`simFeed` and its time-scale field), `reports/PKG-11.md` (camera, director).

Vision: VISION.md §7a ("The tactical view slows time to 25% when you need to think; it never stops"; "Orders show up in
the battle: order lines, ghost paths and the ships' own maneuvers… inside the scene"; "Seeing is not knowing"); §16 T1
("hologram, shield arcs, order lines"); BRIDGE-DESIGN.md §12b rule 3 (ghost line and time to completion before you
commit) and rule 4 (override with a short turn). Absolute paths in `<repo>\`.

## Build, in `src/battle/view/tactical/**` (new)
- **Toggle with one key** (`T`; add that one case to the key handler in `Skirmish.tsx`). On: time scale 0.25 through
  `simFeed`'s time-scale field (never 0), the scene shifts to a hologram treatment (a top-down-ish tactical camera, grid
  on the ring plane, ships as glowing icons by class with their hulls faint), the director pauses its cuts (it stays
  on the tactical camera). Off: back to 1x and the camera the player had.
- **Shield arcs:** four arcs per ship. Own ships: the true strength per side. Enemy ships: only what his side knows
  (the last hits his ships saw land on each side; a side he saw drop shows as down until it is seen to recover);
  never the enemy's true numbers.
- **Maneuver picker:** with a ship (or several) selected, a "Maneuver" list in the order menu (add those lines to the
  comms order menu in `src/battle/view/comms/`; name them in the report) with the six maneuvers; choosing one asks for
  a target (click) and shows the **ghost line** (`previewManeuver()` path per ship, dashed, with its ETA) before
  commit; Enter or click commits through `order({kind:'maneuver',…})`; Esc cancels. Works in the normal view too.
- **Order lines:** every standing order of his ships drawn ship → target (PKG-09 draws attack lines; extend to every
  order kind, including maneuvers in progress as their remaining path).
- Probe: `state('tactical')` (on, timeScale), and `act('tactical', {on})`.

Files you own: `src/battle/view/tactical/**`, the `T` case in `Skirmish.tsx`'s key handler, the maneuver lines in the
comms order menu, order-line drawing code wherever PKG-09 put it (name it), `shots/pkg-12/**`.
Must not touch: `scene.ts` shield shimmer, `director/**` internals beyond a pause call, css look (PKG-15 is changing
those now: add only a call or mount line, keep both on conflict), `src/battle/sim/**` (PKG-13, PKG-14), everything else.
Flag: `tactical` in `src/flags.ts` (append), on in your merge if EXP-03 steps pass. Save: unchanged.
Bench: within +15% of 128 draw calls / 70,340 triangles in the normal view; report the tactical view's own numbers.
Assumed, for Caleb to overrule: `T` as the key; the hologram look.
You cannot prove: whether 25% gives him time to think.
Acceptance: tsc; vitest; lint (your files); build; smoke. Browser `http://[::1]:5212/?skirmish&probe`: EXP-03 steps
1–9 played through the UI with screenshots (render by hand if hidden); time scale read from the probe in both states.
Report `reports/PKG-12.md`.
