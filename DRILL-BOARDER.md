# Drill boarders

Caleb, 2026-10-19: "a drill boarding ship, which will be able to be launched from a capital ship at another capital
ship or cruiser, and on impact will drill through and unleash infantry into the internal hull of the ship in order to
take control of the ship rather than just destroy it."

Thread **drill-boarder** (`claude/drill-boarder-17fc34`, cut from `claude/integration-5d7cd1`). This file is the
design; the code is `src/lib/boarding/` (pure, tested), `src/components/boarding.ts` (the scene) and
`src/components/space/boarder.ts` (the seven models).

## The life of a boarder

```
capital ship's bay ──launch──► flight ──impact──► drilling ──breach──► fight in the hull ──► captured
                                 │                   │                        │               (changes side)
                                 └ shot down         └ shield up: deflected   └ repelled (boarders lost)
                                   (point defence,
                                    flak, lasers)
```

1. **Launch.** Only a capital ship launches boarders, and only at a **cruiser or capital ship** (a fighter is too
   small to drill into). The player locks a target (the hold-to-lock reticle) and presses **T**. The nearest friendly
   capital ship that has a boarder in its bay and is within launch range of the target sends one. Several can be in
   flight at one target; their troops add up inside.
2. **Flight.** A boarder is a slow, armoured torpedo with people in it: 30 L/s (fighters fly 60), turning 2.2 rad/s,
   leading its target. It has 20 seconds of fuel. It can be shot.
3. **Interception.** Every warship has close-in point defence that fires at hostile boarders within 60 L. Its damage
   per second is the hull's own guns (cruiser 12, capital 24), plus 30 for each **flak** it carries and 20 for a
   **point-defence drone** (arsenal's ids, read from the ship's loadout), scaled down as the ship is damaged
   (×(0.3 + 0.7 × hull fraction)) and **split** between the boarders in range. So one boarder at a fresh Mercury
   cruiser (rail + flak) dies; two, or one at a battered ship, get through. The player's lasers also shoot enemy
   boarders down.
4. **Impact and the shield rule.** *Shields must be down.* A boarder that hits a ship whose shield is above 25% of its
   capacity is deflected and breaks up. This is the choice the brief asked for: the drill does not beat shields; the
   player strips them with guns first and then boards, which makes boarding the last move of a fight rather than a
   replacement for it. On this base the shield is the shield part of a ship's hit points (`craftStats` adds the
   loadout's shield to hp; it is spent first); once arsenal merges, the rule reads the facet that was hit
   (`shields.ts facetOf`, `Defence.shield[facet] / maxShield`). A Roman cruiser carries armour, not a shield, so it is
   always open to boarding: on purpose, the legions board and expect to be boarded.
5. **Drilling.** The boarder clamps on where it struck and drills for 2.5 seconds (nation-scaled). The breach costs
   the target 4% of its hit points. While drilling, the boarder is inside the point-defence arc and cannot be shot.
6. **The fight inside.** The troops come out into the hull and fight the crew. Each side has a strength (people) and
   a quality; each second each side loses `0.1 × the other's quality × the other's strength`
   (Lanchester's square law, a model, not a measurement). A side whose strength falls to 30% of what it started with
   breaks: the crew surrenders, or the boarders are wiped out or throw down their arms. The crew is the type's
   (cruiser 36, capital 160) times `0.35 + 0.65 × hull fraction`: a ship already shot to pieces has fewer people left
   standing. Marines fight at quality 1.6, a crew at 0.6, both scaled by nation.
   *What one boarder can take:* a cruiser whose shield is down and whose hull is under about 80%. A capital ship
   needs four or five at once, or three after its hull is under a third.
7. **The result.** *Captured:* the ship changes side, its beacon turns the player's colour, the surviving boarders
   become its crew, and it falls in behind the player as a prize, with the hit points it had left. The capture pays
   the same experience and credits as a kill (progression's `applyKill`). *Repelled:* the boarders are lost; the ship
   keeps fighting, a little more damaged by the breach.

**The local infantry seam.** The fight inside is the infantry-carrier thread's model (`NEW-SHIP-TYPES.md`).
Its interface (`infantry-interface.md`, `src/lib/infantry/`) was not written when this thread started, so
`src/lib/boarding/troops.ts` is a small stand-in behind one interface (`HullFightModel`: start, reinforce, step,
outcome). When infantry lands, its model is plugged into that interface and `troops.ts` is deleted; nothing else
changes. There is no second infantry model beyond those ~60 lines. What this thread needs from it is in
`drill-boarder-to-infantry-carrier.md` in the notes folder.

## Enemy boarders

Enemy capital ships board too, against the **player's capital ship and the prizes the player has taken** (not the
player's own cruiser yet; see the question below). An enemy capital ship launches when a player-side warship is
within its launch range and that ship's shield is at or below the 25% gate, with a 25-second cooldown, as long as its
bay holds boarders. On this base nothing shoots the player's ships, so in practice the enemy goes for prizes: a
captured ship comes over with its shield stripped, and its old navy comes to take it back. Once enemy-ai merges, its
guns strip the player's shields and the same rule makes capital ships board after a fire fight.

The decision (`enemyLaunch` in `src/lib/boarding/enemy.ts`) takes a line-of-sight test as an argument; with
enemy-ai merged it is `tactics.clearShot` over its `Occluder` list (bodies, ships, stations), so a capital ship does
not launch through a planet. On this base it is a sphere test against the bodies.

If an enemy boarding succeeds, the ship goes over to that nation, holds where it is, adrift, and can be boarded
back. A prize's defenders are the boarders who took it, so retaking one is hard.

## The boarder per nation

Row in `src/lib/shipTypes.ts`: `LAUNCHED_SPECS.boarder` (size 0.3 L, 60 hp, hit radius 0.9 L). It is a separate
table, not a fourth `ShipType`: widening `ShipType` makes every `Record<ShipType, …>` in progression, balance and
fleet need a boarder row, and a boarder never patrols or fields a force. The three other new-type threads can put
their launched craft in the same table, one row each.

Names are Greek and Roman, from each people's culture in LORE.md; the troops are named the same way. Nation numbers
are small tilts on the base (×).

| Nation | Boarder | Troops | Silhouette (ART-DIRECTION.md) | Tilt |
|---|---|---|---|---|
| Earth (Humans) | **Breacher** | marines | lathed cigar, swept fins, brass | the base |
| Moon (Selenitai) | **Gnomon** (a sundial's needle) | temple guard | needle in an open silver ring | faster, fewer troops, drill ×0.9 |
| Mercury (Hemerodromoi) | **Dory** (the hoplite's spear) | hoplites | round bronze shield, gold rim, drill through its centre | tough (hp ×1.3), troops and crews ×1.25 quality, slow |
| Venus (Nephelai) | **Siphon** (the Greek-fire siphon) | kataphraktoi | gold teardrop, green glass dome | fire burns through: drill ×0.7 |
| Mars (Quirites) | **Harpax** (Agrippa's grappling bolt) | legionaries | flat grey dagger-wedge, one red stripe, flat nozzle bank | troops ×1.25, the legion's boarding doctrine |
| Jupiter (Diadochoi) | **Embolon** (the ram) | argyraspides (the Silver Shields) | violet crescent claws round the drill, magenta seams | elite troops ×1.2 quality, hp ×1.2 |
| Saturn (Autochthones) | **Epibates** (a trireme's marine) | epibatai | long black spine, oar-fins, amber lights | fast (×1.25), long range (×1.3), fewer troops |

## Bays

Until the destroyer thread's `destroyer-hangars.md` exists, a capital ship carries **4 boarders** and nothing else
does (`BAY` in `src/lib/boarding/spec.ts`, marked stand-in). The bay refills each flight. When the hangar table
arrives, `BAY` reads from it.

## The player's capital ship on this base

Fleet-command (`claude/fleet-command-885c0e`) gives the player a capital ship that follows. It is not merged here, so
the player nation's own capital ship keeps station near the player (`escortStep`, marked stand-in) and launches from
there. When fleet-command merges, its flagship is a driven `Craft` of the player's side and the launcher search picks
it up unchanged; delete the stand-in escort. The `driven` / `fwd` fields added to `Craft` are fleet-command's, with
its exact names and its one line in `combat.update`, so the two branches agree.

## Saving

`GameData.prizes` (store.ts): each prize's nation, type, its index in that nation's force, hit points and crew. It is
saved the moment a ship is taken or lost (like progress), and on load the craft at that index is taken out of its
home patrol and put back behind the player. A save without `prizes` loads with none.

## Proposal for Caleb: what a captured ship means

Not built beyond the first line; for Caleb to decide.

- **Built now:** a capture pays like a kill, and the prize escorts the player for the rest of the game, saved.
- **Proposed, cruisers:** a captured cruiser joins fleet command as a wing of its own (order: follow/defend), using
  its own race's loadout, flying under the player's colour. It can be repaired at the player's home for credits, or
  sold to the yard as prize money (half its type's kill credits ×4), the old naval prize-court custom.
- **Proposed, capital ships:** a captured capital ship is the biggest prize in the game. It becomes a second
  flagship: fleet command can give it its own wings, and its bay holds boarders and fighters. Progression caps it:
  one captured capital ship per two levels above 3, so it cannot be farmed at level 1. Taking one pays 1.5× a
  capital kill's experience. Losing it (destroyed or boarded back) is a real loss: its wings go with it.
- **Proposed, conquest:** a planet whose capital ship has been taken loses its patrol leader; conquest could count
  that as a step toward taking the planet.

## Not done here

- The player's own cruiser cannot be boarded (open question below).
- Prizes do not fight on this base: they follow. Fleet-command's brains will fly and fire them.
- Boarders are not bought at the shipyard; the bay refills each flight.
