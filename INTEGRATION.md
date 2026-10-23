# Integration: how the threads are tied together

Ascent Flight is built by many sessions at once, each on its own branch (`claude/<thread>-<id>`). This file is the
procedure any session runs, as **integration pass N**, whenever threads finish. It merges finished work into one
integration branch, proves the game still flies and fights, checks that progression, story and balance agree, and
writes `INTEGRATION-REPORT-<N>.md` with a fix list per thread and the decisions only Caleb can make.

Pass 1 was run on 2026-10-18 on `claude/integration-5d7cd1` (see `INTEGRATION-REPORT-1.md`). Pass 2 was run on
2026-10-19 on `claude/integration-2-586c1e`, cut from pass 1 (see `INTEGRATION-REPORT-2.md`).

## Rules

- Merge into the integration branch only. Never into `main`; `main` gets the integration branch when Caleb says so.
- Never commit to another thread's branch, and never merge a thread that is still running or has uncommitted work.
  Read its state with `git show <branch>:<file>` (or read its worktree without writing) and report on it instead.
- Don't message the other sessions. The report's fix list is how a problem reaches its owner.
- Prove every "fixed" with a number: a test, a simulator figure or a reading from `window.__voyage`.
- A conflict that needs a design decision goes on the decisions list, not into a guess. Where both sides' intent can
  be kept, keep both and say how in the merge commit.
- Commit in stages: each merge on its own, then fixes, then the report.

## 1. Inventory

```bash
git branch --list "claude/*" -v
git worktree list
```

For every branch:

| Read | Command |
|---|---|
| Commits past main | `git log --oneline 9e4d39d..<branch>`; already merged here: `git rev-list --count HEAD..<branch>` = 0 |
| What it claims | `git show <branch>:THREAD-LOG.md` (its own entry), `git show <branch>:SPEC.md` (its section) |
| Files it touched | `git diff --stat 9e4d39d <branch>` |
| Still running? | the session list (`list_sessions {"linked": true}`: `isRunning`) and `git -C <worktree> status --short` |
| Hand-over notes | the shared notes folder (`side-session-notes/<top session>/*.md`) |

A branch is **finished** when its session is idle, its worktree is clean, and its THREAD-LOG entry has a Done section.
Otherwise it is **running**: coherence-check its committed state and leave it unmerged.

## 2. Overlap map and merge order

List, for each pair of branches, the files both touch (`git diff --name-only 9e4d39d <branch>`). Merge in this order
so each merge sits on the things it depends on and conflicts stay small:

1. **Foundations**: scale (`planet-scale`), ship types, targeting, small input changes (`g-key-weapon`).
2. **Content tables**: races (names, lore), arsenal (munitions, shields, modules).
3. **Systems on top**: progression (levels, economy, loadouts), fleet command (orders, enemy weapons), stations and
   moons.
4. **Presentation last**: art direction and ship styles, graphics, atmospheric flight. These touch `Voyage.tsx`,
   `materials.ts` and the scene everywhere, so they go in after the content is settled.

Hot files to read closely on every merge: `src/components/Voyage.tsx`, `src/components/combat.ts`,
`src/lib/nations.ts`, `src/lib/store.ts`, `src/styles.css`, `src/components/space/materials.ts`, `SPEC.md`,
`THREAD-LOG.md`.

Known couplings (keep them true after every merge):

- Every new ShaderMaterial goes through `withLogDepth` (planet scale's log depth buffer).
- Ship-sized numbers (weapons, hit radii, patrol speeds) stay in ship units; cosmos distances scale by `COSMOS`.
- `Craft.radius` is the body radius; each weapon adds its own reach (`LASER.radius`, `MISSILE.radius`).
- An enemy's hit points and dodge come only from `lib/craftStats.ts` (type table + race loadout).
- G switches the weapon (Caleb, 2026-10-18). No branch may bring back Q, 1 or 2.
- Since pass 2: an enemy's fit is enemy-ai's `rollFit`, read through `craftStats.ts craftArms`; `Craft.hp` is gone,
  hit points are arsenal's `def` (hull + shield facets). The player has one hull, arsenal's `player.def`.
- The player's fit is progression's shipyard, flown as arsenal's loadout (`progress.ts flightLoadout`).
- Anything else the player's shots can hit (sites, carriers) goes through combat's `hooks.solids`, which arsenal reads.
- Every new `ShipType` row needs a row in every `Record<ShipType, …>`; grep for `capital:` after adding one.
- Keys by context: C countermeasure (fleet orders when commanding), L dock in range (else land infantry), T board.
- Inside an atmosphere the sky is atmo-flight's dome; graphics' shell for that body hides (`world.airShells`).

## 3. Merge and verify

For each finished branch, in order:

```bash
git merge --no-ff --no-edit <branch>
npx tsc -b
npx vitest run --dir src   # plain `vitest run` also picks up every other worktree's tests
npm run build
```

Then the smoke flight on the dev server (`npm install` once, then `npm run dev -- --port 5305 --strictPort` in the
background) in the in-app browser, driven through `window.__voyage` (and `window.__pilot` since progression):

| Check | How | Pass |
|---|---|---|
| New game | click New game, then a race card | `__voyage` exists, 49 crafts, 42 hostile |
| Flight to Mars | `v.actions.fly('mars')`, then `v.run(1)` until `v.dbg.parks` has `mars` | parked, `dbg.hits` unchanged |
| Grand tour | `v.actions.tour()`, `v.run(1)` in chunks of ~25 s of wall time, `continueRoute()` when waiting | all 10 stops in `dbg.parks`, `dbg.hits` unchanged |
| Laser fight | drive `combat.update` and `combat.trigger('laser', …)` aimed at the lead on a hostile cruiser and fighter | each dies; hits = hp ÷ 12 |
| Missile fight | hold the sight on a hostile cruiser until `combat.lock.locked`, then trigger `missile` | lock at 1.5 s; it dies |
| Progression | `__pilot.progress()` after the kills | XP and credits match `ECONOMY` by ship type |

The pane often returns stale screenshots while hidden: prove with numbers, and say when an image is missing.

Resolve conflicts by keeping both sides' intent. Write in the merge commit what each side wanted and how both survive.
If a merge breaks a test, fix the integration code (not the other thread's branch) or, if the fix needs a design
call, back the merge out (`git merge --abort`) and put it on the decisions list.

## 4. Coherence checks

### Progression

Walk the path from a new game: faction start → cruiser → levels → fighter bay → capital ship → armada. For each step
write what unlocks it, at what level or price, and check:

- **No dead ends**: every level and tier can be reached with the XP and credits the world can actually pay out. Count
  them: XP and credits per kill (`ECONOMY`) × the ships that exist (`NATIONS` × `FORCE`), and whether ships respawn.
- **Nothing unlocks before what it needs** (a fighter before the bay, a capital command before fleet command exists).
- **Nothing reachable that the story or economy has not got yet** (a purchase that does nothing, a tier with no items).
- **Rewards follow risk**: XP and credits per second of fighting, by ship type, from the simulator's times to kill.

### Storyline

Read `LORE.md`, `lib/races.ts`, nation names, ship class names (`progression/refs.ts`), station and base names,
munition and module names, loadouts and doctrines side by side. Check that they agree with each other and with the
Greek and Roman theme, and grep for what was removed on purpose:

```bash
grep -rniE "zodiac|astrolog|horoscop|planetary (metal|hour|day)|hermetic|kabbal|occult|alchem|tarot|sigil|angel|natal|ascendant|ptolem|agrippa|chaldean|poimandres|paracelsus|ecliptic" src LORE.md SPEC.md PROGRESSION.md
```

The only allowed hits are the documents saying these were removed.

### Balance

Prove by simulation, not feel. `src/lib/balance/` is a headless simulator run by vitest that uses the game's own
code and tables (`weapons.ts` maths, `shipTypes.ts`, `nations.ts` patrols, `craftStats.ts`):

```bash
npm run balance                                     # prints the report
BALANCE_OUT=integration/balance-<N>.md npm run balance   # and saves it
```

- `engage.ts`: one parked shooter against one patrolling ship, with the real missile, dodge, lead and hit code and a
  Gaussian aiming error. Kill rate, time to kill, hit rate, DPS, dodge rate.
- `battle.ts`: fleet against fleet, every shot hitting with the probability `engage` measured. Enemies have no guns
  yet, so the armament per type is an explicit assumption (`mounts`) that every report states.
- `report.ts`: the bands, written before the run. Change a band only with a reason in the report.

| Band | Limit |
|---|---|
| Mirror fight (same type or same race both sides) | side A wins 35–65% |
| Player's time to kill, best weapon, 0.5° aim | fighter 0.5–3 s, cruiser 1.5–6 s, capital 10–45 s |
| Kill rate within 60 s | ≥ 90% for every type |
| Race spread | no race's ship of a type takes more than 1.5× the median race's time to kill |
| Type order | for every race: fighter dies before cruiser, cruiser before capital |
| Escorts | a capital ship alone beats six fighters ≤ 35% of the time; with two cruisers ≥ 65% |
| Role split | neither weapon out-damages the other against every type by more than 1.5× |
| Useful | no weapon hits a type less than 15% of the time |
| Race cruisers (once enemies shoot) | no race's level-1 cruiser wins more than 65% of its fights against the others |

Keep balance changes to numbers in tables (or, where a merge broke a rule both sides relied on, to the formula that
restores it), and list each with its before and after.

## 5. Output of each pass

`INTEGRATION-REPORT-<N>.md`:

1. Branches merged (with commit), branches left out and why.
2. Conflicts and how each was resolved.
3. Test, build and smoke results, with the numbers.
4. Coherence findings, progression, story and balance, each with its evidence.
5. Balance changes made, before and after.
6. **Fix list per thread**: the branch or file that owns each problem.
7. What the next passes need, and from which branches.
8. Decisions only Caleb can make, one per line, the most blocking first.

Save the simulator run as `integration/balance-<N>.md`, and leave a short hand-over note in the shared notes folder.
