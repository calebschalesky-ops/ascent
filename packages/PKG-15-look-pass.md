# PKG-15-look-pass
Label: PKG-15 · Kind / seat: look / Zeuxis (read `<local>`) · Base: claude/game @
<launch prompt> · Port: 5215 at `http://[::1]:5215/` · Worktree `pkg-15`

Makes these steps pass: no new script steps; it keeps one game (method step 7, "look") and must not lose a pass.
Closes the look rows on the board and F6 for the battle view. Read first: `reports/PKG-11.md` (close-shot crop, inset
without bloom), `reports/PKG-09.md` (HUD layout, `--pip-clear`), `ART-DIRECTION.md` (main checkout).

Vision: pillar 7 ("Every frame should look like art, and still read clearly at a glance"); VISION.md §7a ("It should
look like the best space battle in a film, every frame"; "Chaos you can't follow" is on the never-feel list); §12 look
and feel. Absolute paths in `<repo>\`.

## Measured by Daedalus (2026-10-21, screenshots opened)
- `shots/pkg-11/exp04-strip-04-seed4-23s-close.jpg`: shield shimmer reads as opaque orange bubbles that swallow the
  hulls in close shots.
- `shots/pkg-11/exp04-step5-pip-breach-seed4-27s.jpg`: the inset has no bloom, so fire and engines look flat in it.
- `shots/pkg-09/exp02-step6b-attack-order-line-ack-points-4.jpg`: at 800 px the queue, crew panel, event log and roster
  cover most of the battle; the battle should stay the picture.
- PKG-11: some close shots crop large hulls at the frame edge.

## Do
1. Shields: a thin, mostly transparent shimmer that shows the four sides (a side's hit flash bright, the rest barely
   there), so the hull reads first.
2. Inset: the same post-processing as the main view (or a cheap bloom), within the bench note.
3. HUD density: the battle stays the picture at 800 px and 1280 px: panels collapse or fade when not in use (crew panel
   folds to five officer chips; the event log fades after a few seconds; the roster strip compacts); keep the queue and
   its keys legible at 375 px. Use the look-unify tokens.
4. Close shots frame the subject's whole hull (director framing numbers in `director/numbers.ts`, the framing function
   only; PKG-12 may add a pause call in the director: keep both).
5. **F6 for the battle view:** a test that fails on a raw hex colour or a `font-family` outside the token file in
   `src/battle/view/**` (art files with their own colours listed as exempt).
6. Walk every battle screen (normal, comms open, crew panel, end screen, PiP, 375 px) before and after; screenshots.

Files you own: `scene.ts` shield and material code, `src/battle/view/**/*.css`, the director's framing function and its
numbers, the PiP render pass, the layout/collapse code of the comms panels (not their logic or order menu: PKG-12 adds
maneuver lines there now), the F6 test, `shots/pkg-15/**`.
Must not touch: `src/battle/view/tactical/**` and the order menu (PKG-12), `src/battle/sim/**` (PKG-13, PKG-14),
everything else.
Flag: none. Save: unchanged. Bench: within +15% of 128 draw calls / 70,340 triangles; report before and after, with
and without the inset.
You cannot prove: whether it looks like a film (before/after pairs for Caleb).
Acceptance: tsc; vitest (the F6 test passes on your result, and fails on a planted raw hex); lint (your files); build;
smoke. Browser: the before/after walk. Report `reports/PKG-15.md`.
