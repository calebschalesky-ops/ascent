# One look across the game (2026-10-21, branch `claude/look-unify`)

Base: `e16c690` (integration tip, which already holds every thread's branch) merged with the two branches still
ahead of it, `graphics-pass-3-264f8a` and `one-look-per-people`. Not on this base: `master` (handoff docs only),
`real-scale`'s hyperdrive step (2 commits) and `specials-spawn` (1 commit). None of the three touches the interface.

## What was off, and where

The graphics overhaul moved the interface from The Ascent's parchment and serif to a glass look by laying
`styles-glass.css` over `styles.css` and remapping the token names. That caught every rule that used a token. It
missed everything that used a literal colour or did not go through CSS at all:

| Area | What it was | Now |
|---|---|---|
| Names in the 3D scene (planets, moons, stations, armour, conquest sites) | `LABEL_FONT` = IM Fell English, cream `#efe3c4` / `#fff4d6` | the HUD's display sans, HUD white |
| Nav map (canvas) | IM Fell labels, cream rings and text, gold route | sans, glass colours, amber route |
| Hotbar | grey-purple slots with cream labels | glass slots, hairline edge; Minecraft shape and white pick frame kept (mc-controls R4) |
| Pilot HUD | cream text on a bare dark wash; sat over the Full button | glass card, cyan XP bar, moved to 232 px below Full |
| Key bindings | light paper chips (`rgba(255,255,255,.35)`) | dark glass chips |
| Disabled buttons (shipyard, fighter bay) | amber at low opacity, read as brown | empty glass button |
| Codex art captions (bases, ship lineup) | Georgia serif, cream, gold frame | **not changed here**: `codex/art/*` is race art, graphics-pass-3's territory. Filed under Requests on `TEAM-BOARD.md` |
| Fleet tactical view (canvas) | its own cyan, pale gold and greens | the shared cyan, amber, danger and good |
| `styles.css` | ~60 literal parchment colours (cream hairlines, gold glows, ink rules) | mapped onto the glass tokens |
| Tokens | three copies: `styles.css` (parchment), `styles-glass.css` (glass), `opening.css` (`--g-*`) | one `:root` in `styles.css`; the others alias it |
| Fonts | IM Fell English and Cormorant Garamond still loaded on every start | imports removed (the npm packages are left in package.json) |

## Seen and not fixed (needs an art decision, not a palette)

- **Two art styles in the codex.** Race portraits are painted (webp); bases and ship lineups are flat vector SVG.
  Side by side on one page they read as two games.
- **The pilot avatar** in the opening is a flat cartoon, next to the painted portraits in the codex.
- **Phone:** the shakedown coach covers the Menu / Nav / Jump column at 375 px. Planet labels on the horizon overlap
  each other (SATURN over another name).
- **The edge** is still drawn gold on the nav map and in the edge room (`InsideRoom.tsx`). Left alone as its own colour.
- The station screen could not be docked from a script in this pass; its CSS goes through the shared tokens and its one
  literal was mapped, but nobody has looked at it on screen.

## The audit, ranked (every mismatch found, fixed or not)

Ranked by how much of a player's time it is on screen. Shots are in `shots/look-unify/`.

| # | Mismatch | Owner | State | Shot |
|---|---|---|---|---|
| 1 | Planet, moon, station and conquest names in the 3D scene in IM Fell serif, cream | look-unify | fixed (91a11cf) | `before-flight-hotbar-pilot.jpg` → `after-flight.jpg` |
| 2 | Hotbar: grey-purple slots, cream labels | look-unify | fixed (693b4ff) | `before-flight-hotbar-pilot.jpg` → `after-flight.jpg` |
| 3 | Pilot HUD: cream text on a bare wash, covering the Full button | look-unify | fixed (96b9d7d) | `before-flight-hotbar-pilot.jpg` → `after-flight.jpg` |
| 4 | Nav map: serif labels, cream rings, gold route | look-unify | fixed (6ebb553) | `after-navmap.jpg` |
| 5 | Phone: shakedown coach covers Menu / Nav / Jump; horizon planet labels overlap | integrator | open, on the board | `phone-coach-covers-column.jpg` |
| 6 | Codex mixes painted race portraits with flat vector bases and ship lineups | graphics-pass-3 (art call for Caleb) | open, on the board | `codex-painted-vs-flat.jpg` |
| 7 | Opening's pilot avatar is a flat cartoon beside painted codex portraits | graphics-pass-3 | open, on the board | `pilot-avatar-flat.jpg` |
| 8 | Codex art captions in Georgia serif, cream, gold frames | graphics-pass-3 (`codex/art/*`) | open, on the board with the exact change | `codex-base-serif-gold.jpg` |
| 9 | Shipyard disabled buttons read brown | look-unify (CSS only; `Shipyard.tsx` untouched) | fixed (7b3cd54) | `before-shipyard-brown-disabled.jpg` → `after-shipyard.jpg` |
| 10 | Key binding chips are light paper | look-unify | fixed (1c38638) | `before-keybind-paper-chips.jpg` |
| 11 | Fleet tactical view has its own cyan, gold and greens | look-unify | fixed (3ea85ab) | not seen on screen (needs a fleet) |
| 12 | Station screen fallback colour gold | look-unify | fixed (b4aed8b) | not seen on screen (could not dock by script) |
| 13 | ~60 parchment literals across styles.css; three copies of the tokens; two serif fonts loaded at start | look-unify | fixed (fcfe10d, e1ee9fd, b246d76) | n/a |
| 14 | "The edge" drawn gold on the nav map and in its room | none needed | left as its own colour | `after-navmap.jpg` |

No Gemini prompts were written; none are needed for these.

## Commits

One finding per commit on top of the merge `6caad80`, so the integrator can take any of them alone (rule 1 on
`TEAM-BOARD.md`). The styles.css commits stack in order: literals, tokens, hotbar, pilot HUD, key chips.

## Proof

`tsc -b` clean; `vitest run` 50 files, 651 tests pass. Looked at in the browser before and after: title menu,
codex, settings and key bindings, the three opening steps, flight HUD, pause menu, shipyard, nav map, phone flight
view. A DOM probe for serif fonts, warm parchment colours and light paper fills on the flight screen went from 17
flagged elements to 1 (the weapon tag's salmon, which is a category colour).
