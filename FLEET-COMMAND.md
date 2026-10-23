# Fleet command — plan

Caleb, 2026-10-18: "I want the progression to get to a point where you can command capital ship, and then from there,
I'd like you to be able to add cruisers as well as a lot more fighters that you can deploy from your capital ship in
battle and control their targets, flight paths, defenses, strategies, missions, etc. The next step after getting your
capital ship will be building an armada with multiple ships, capital, cruiser, fighter, etc."

This is the plan for that, built on the ship types (`claude/ship-types-4d54b4`: capital 5×, cruiser 1×, fighter 0.2×
of the player ship, hit points, per-nation forces). The research behind it is in
[FLEET-COMMAND-RESEARCH.md](FLEET-COMMAND-RESEARCH.md) (30 pages read on 2026-10-18; the ones that failed to load are
listed there). Part 8 says what the first build already does.

---

## 1. What the research says, in one page

Ten games, and the same lessons keep coming back.

1. **Few verbs.** EVE runs fleets of hundreds on a handful of calls (primary, anchor, align, broadcast)
   ([Brave Collective: Fleet Basics](https://wiki.bravecollective.com/public/dojo/wiki/fleet-basics), read 2026-10-18;
   [EVE University: Brevity codes](https://wiki.eveuniversity.org/Brevity_codes), read 2026-10-18). FTL has a few
   actions, each with an obvious result ([Expert Reviews: FTL](https://www.expertreviews.co.uk/games/pc-games/52216/ftl-faster-than-light-review),
   read 2026-10-18). X4's long list of overlapping roles, and its unclear rules for what a ship does once an order
   ends, are what its players complain about most ([Steam: X4 subordinate orders](https://steamcommunity.com/app/392160/discussions/0/2253433385446311456),
   read 2026-10-18).
2. **The pilot's own target is the pointer.** FreeSpace 2's "attack my target" orders, sent from the C comms menu
   with number keys, and Star Wars: Squadrons' single ping button work while flying. In Squadrons, ping an enemy and
   your side attacks it; ping a friend and your side defends it
   ([Squadrons ping guide](https://www.magicgameworld.com/?p=125165), read 2026-10-18;
   [FreeSpace Port dev log 11](https://www.nomadsreviews.co.uk/post/freespace-port-recharged-dev-log-11-rally-points),
   read 2026-10-18).
3. **Who, then what.** Bannerlord: a number key picks the group, an F-key picks the order, and groups start sorted by
   type ([GamerGuides: Bannerlord tactics](https://gamerguides.com/mount-and-blade-ii-bannerlord/guide/introduction/useful-gameplay-tips/tactics),
   read 2026-10-18). That two-key grammar is what makes ordering possible with one hand while the other flies.
4. **Whether to shoot is a different question from how to fight.** Homeworld Remastered splits rules of engagement
   (fire at will, return fire, hold fire) from stance (aggressive, normal, evasive); Battlefleet Gothic: Armada sets an
   engagement distance and a broadside side and lets the ship fly itself
   ([BFGA shortcuts](https://www.magicgameworld.com/?p=28659), read 2026-10-18;
   [GamePressure: BFGA review](https://www.gamepressure.com/e.asp?ID=681), read 2026-10-18).
5. **Slow time, don't stop it.** Armada's slowed tactical time keeps the tension and still gives time to think
   ([GamePressure](https://www.gamepressure.com/e.asp?ID=681)); FTL's pause suits juggling many systems
   ([Wikipedia: FTL](https://en.wikipedia.org/wiki/FTL:_Faster_Than_Light), read 2026-10-18). Homeworld players pause
   on the Sensors Manager to re-issue orders, and a review praised how smoothly the camera moves from the fight to that map
   ([StrategyGamers: Homeworld walkthrough](https://strategygamers.com/walkthrough/homeworld-remastered-collection-3),
   read 2026-10-18; [Shacknews: Homeworld](https://www.shacknews.com/article/1480/homeworld-good), read 2026-10-18).
6. **Focus fire is the most valuable order.** EVE calls a primary because spread damage gives the other side's healers
   time ([Ten Ton Hammer: Calling targets](https://www.tentonhammer.com/eve/guides/combat/calling_targets), read
   2026-10-18). Sins II can focus or spread fire across a whole enemy ship type from the fleet panel
   ([Steam: Sins II fleet behaviour](https://steamcommunity.com/app/1575940/discussions/1/4633736682039958065), read
   2026-10-18).
7. **Roles by class.** X4 has escorts that intercept small ships and others that bombard big ones; the flaw is that
   they never fall back to "anything" once their class is gone
   ([X4 wiki: Intercept/Bombard](https://wiki.egosoft.com/X4%20Foundations%20Wiki/Manual%20and%20Guides/Objects%20in%20the%20Game%20Universe/Orders%2C%20Behaviours%20and%20Assignments/InterceptBombard%20for%20Commander%20%28Assignment%29/),
   read 2026-10-18).
8. **Formations work best one ship type per group.** Homeworld players say mixed-type formations fall apart: frigates
   drift ahead and die while big ships lag
   ([Steam: HWR formations](https://steamcommunity.com/app/244160/discussions/0/1693785035805155936), read 2026-10-18).
9. **Obedient beats clever, and suicidal is unforgivable.** FreeSpace wingmen fly into point-defence fire
   ([Wikipedia: FreeSpace 2](https://en.wikipedia.org/wiki/FreeSpace_2), read 2026-10-18); Elite's "Engage at will"
   fighter charges the biggest enemy group, so experienced players keep it on hold fire and hand it one target at a
   time ([ElitePVE thread](https://www.elitepve.com/viewtopic.php?p=90972), read 2026-10-18). X4's "Attack" seeming to
   do nothing reads as a bug ([Steam: X4](https://steamcommunity.com/app/392160/discussions/0/2253433385446311456)).
10. **Recall must always work.** Form-on-my-wing in FreeSpace and Recall in Elite are the panic buttons that make
    players willing to commit ships ([ElitePVE](https://www.elitepve.com/viewtopic.php?p=90972)).
11. **A squad is a big job.** Everspace 2's developers said a squad system isn't planned for a lone-pilot arcade game
    ([devtrackers: Everspace 2](https://devtrackers.gg/everspace-2/p/36b70923-new-content-questions), read 2026-10-18).
    That is an argument for building the brains once, for both sides.
12. **The capital ship is the fight's centre.** Squadrons' fleet battles run dogfight, then escorts, then flagship
    ([Press Start: Squadrons](https://press-start.com.au/reviews/pc-reviews/2020/10/01/star-wars-squadrons-review-be-my-wingman/),
    read 2026-10-18); Armada's big ships turn slowly, and making them turn is the play
    ([CGMagazine: BFGA](https://www.cgmagonline.com/review/game/battlefleet-gothic-armada-review), read 2026-10-18).

So the design rules for this game are: **six orders, said with the player's own target; groups by ship type; a
stance per group; one key to bring everyone home; slowed time on a tactical view one key away; ships that do the
sensible thing when an order ends; and a line on screen for every order, so obedience can be seen.**

---

## 2. The progression path

Fleet size is capped by **command points**: a fighter costs 1, a cruiser 3, a capital ship 10. The ship the player
flies is free. A cap on points, not on ship counts, lets the player choose between many fighters or a few cruisers.

| Step | Rank | Unlocked by | Player flies | Bay / fleet | Cap | Wings that take orders |
|---|---|---|---|---|---|---|
| 1 | Pilot | Start (progression's faction start: your race's cruiser) | Cruiser | none | 0 | 0 |
| 2 | Flight lead | Level 2: the cruiser's bay opens (progression: 1 fighter, 2 at level 4, 3 at level 6, bought at the shipyard) | Cruiser | 1–3 fighters | 3 | 1 |
| 3 | Squadron leader | Level 8: the fourth bay slot (progression) | Cruiser | 4 fighters | 4 | 1 |
| 4 | **Captain** | Level 10 (progression's top level) **and** the mission "Take command" (escort a capital ship home; it is given to you) | **Capital ship** | 2 cruisers, 8 fighters | 14 | 3 |
| 5 | Commodore | Captain, and a second capital ship (bought at a shipyard or captured) | Capital ship | 4 cruisers, 16 fighters, +1 capital | 38 | 5 |
| 6 | Admiral | Commodore, and a shipyard (a held planet) | Capital ship (flagship) | 8 cruisers, 32 fighters, up to 4 capitals | 100 | 8 |

The levels are progression's (`src/lib/progression/levels.ts`: 50 × L × (L − 1) XP, top level 10, bay slots at 2, 4,
6 and 8). Its level 10 already says "room for a capital-ship command"; that is where Captain sits. Ranks past Captain
are gated by what the player owns, not by level, so the level curve does not have to grow.

What the player gains at each step:

- **Flight lead / squadron leader** (progression has built the bay and wingmen: B launches, V recalls; they escort
  and attack the player's lock): two orders only, *attack my target* and *form on me*, with one wing. This is the tutorial for the command grammar; a fighter dies in three laser hits,
  so losing one teaches the cost.
- **Captain** is the big change. The player stops being a fighter pilot with friends and becomes the centre of a
  battle: a slow ship with turret guns, 900 hit points, a bay, and three wings (cruisers, two fighter wings). The
  full order set, formations, stances and the tactical view open here.
- **Commodore**: a second capital ship joins as a wing of its own, with its own escorts. *Missions* open: a group can
  be detached (raid, scout, blockade, escort a convoy) and sent somewhere the player is not.
- **Admiral**: an armada. Doctrine set before battle; the flagship can be changed (the player moves to another
  capital ship). The cap is the limit, and holding planets is how it grows (ties into conquest).

The bay restocks at a friendly station or planet (stations branch: capital ships dock outside); lost ships are
replaced by purchase. The rank table lives in one file, `src/lib/fleet/command.ts` (`RANKS`, `rankFor`,
`canCommand`), reading progression's level (see section 8).

---

## 3. Command

### Who: wings

Ships come in **wings**, sorted by type when they launch (Homeworld's lesson): *Cruisers*, *Alpha* (first four
fighters), *Beta* (next four), and from Commodore up, one wing per extra capital ship. **All** addresses every wing.
Wings can be split and merged on the tactical view (later build).

### What: the six orders

| Order | What the ships do | When it ends |
|---|---|---|
| **Attack** (my target / tapped ship) | Every ship in the wing goes for that one ship: focus fire. Obeyed even under hold fire: a direct order wins. | Target destroyed → the wing falls back to its stance near where it is (never idles). |
| **Defend** (me / a friendly ship) | Keep station on the ward in the wing's formation. Anything that hits the ward, or targets it, is chased and shot first; failing that, anything close. | Ward destroyed → hold where it died. |
| **Follow** (form on me / a ship) | Take formation slots on the leader. Engage what the stance allows, within its leash, then come back. | Never; this is the default after launch. |
| **Hold** (here / a tapped point) | Hold that point in formation, facing one way. | Never. |
| **Path** (drawn on the map) | Fly the waypoints in formation at the slowest member's pace, waiting for stragglers; loop it to patrol. | Last point → hold there. |
| **Recall** | Fly home and dock in the carrier's bay. Always works, from anywhere. | Docked. |

**Launch** puts the bay's next wing out (the default order is Follow me). Retreat is Recall; there is no separate verb.

### How: formations

Each wing has one formation. Slot gaps scale with the biggest member (a capital ship wing stands five times wider
than a fighter wing) and never fall inside the leader's hull.

| Formation | Shape | Gap | For |
|---|---|---|---|
| Wedge | a V behind the leader | 3 lengths | moving and attacking |
| Line abreast | side by side | 4 lengths | broadsides, sweeping a path |
| Column | one behind another | 3.5 lengths | narrow paths, past planets |
| Screen | a ring round the leader, a little ahead of it | 2.5 lengths | fighters screening the capital ship |

### How hard: stances

A stance sets how far a ship looks for targets, how far it may chase from its post, whether it fires, how hard it
weaves and the distance it holds off a target. Numbers are × the ship's gun range (fighter 60 lengths, cruiser 100,
capital 160).

| Stance | Looks for targets | Chases from post | Fires | Weave | Holds off at |
|---|---|---|---|---|---|
| Aggressive | 2.0 | 4.0 | yes | 0.15 | 0.3 |
| Defensive | 1.0 | 1.2 | yes | 0.35 | 0.55 |
| Hold fire | never | never | no (except a direct Attack) | 0.35 | 0.6 |
| Evasive | 0.8 | 0.8 | yes | 1.0 | 0.9 |

The research says to split "whether to shoot" from "how to fight" (section 1, point 4). Here *Hold fire* is one of
the four stances because Caleb named it as one; splitting it into its own fire switch is the first decision (section 9).

### Defensive roles

- **Screen**: a Defend order on the flagship in Screen formation. Fighters ring the capital ship and go after
  anything that hits it.
- **Point defence**: a capital ship's second pair of turrets always fires at the nearest enemy fighter in range
  before its main target. No order needed.
- **Escort**: Defend on any friendly ship (a convoy, a second capital ship).

### Doctrine (later build)

Set before battle on the fleet screen, per wing: default stance, default formation, a **target priority** (fighters
first / capitals first / whoever hits the flagship), and a **break-off line** (pull back to the flagship below 30% hull).
Doctrine is what a wing returns to when its order ends, so the player only gives orders that change the plan.

### Missions (later build, Commodore up)

A detached group with an order that lasts beyond the current fight, shown on the map with a timer and a status line:

- **Raid**: fly to a body, attack whatever its nation fields there, come back at 50% losses or when done.
- **Scout**: fly a path in Evasive, report every enemy ship seen (the map shows them for 60 s).
- **Blockade**: hold a ring round a body, attack anything leaving or arriving.
- **Escort a convoy**: Defend on a convoy along its route.

Each mission is built from the six orders plus a rule for when it ends, so the brains need nothing new.

---

## 4. The interface

### While flying (mouse and keyboard)

- **C** opens command mode (FreeSpace's comms key). A strip at the foot of the screen shows the wings and the orders
  with their keys. In command mode: **1–5** pick a wing (1 is All); **A** attack my target, **D** defend me,
  **F** follow me, **H** hold here, **P** draw a path (opens the tactical view), **L** launch, **R** recall,
  **V** next formation, **B** next stance. Giving an order closes command mode; **C** or **Esc** closes it without one.
  Steering by mouse carries on while it is open; the keys it uses are the flight keys, so they wait.
- **Z** is the ping (Squadrons): the selected wing attacks the ship you have locked, or forms on you if nothing is.
- **T** opens the tactical view.
- Outside command mode, progression's **B** and **V** still launch and recall the cruiser's bay fighters; inside
  command mode they are stance and formation. From Captain up the capital ship's bay is fleet command's (L).
- Every order gets a line in the HUD ("Alpha · attack · Mars nation capital ship") and a marker on screen.

### On the tactical view

The navigation screen gains a **Fleet** tab (key **T**). Time runs at **25%** while it is open; a button pauses it
fully and another runs at full speed. It is a top-down map centred on the flagship, a few kilometres across, with:

- every ship as a symbol by type (capital a long bar, cruiser a triangle, fighter a dot), the player's side in blue,
  hostile in its nation's colour, each with a hit-point tick;
- for the selected wing: its order as a line (red to an attack target, a ring round a ward, the path with numbered
  points), its formation slots, and its **engagement circle**, which grows and shrinks as the stance changes;
- planets as filled circles with their keep-clear ring.

Tap (or click) a wing chip or one of its ships to select it. Tap an enemy: Attack. Tap your own ship (or a ship of
the selected wing): Defend it. **Hold at…** then a tap: hold there (a plain tap on empty space does nothing, so a
drag to pan never turns into an order). **Path** mode: each tap adds a waypoint; **Send path** sends it, **Loop**
makes it a patrol.
Buttons for every order sit below the map, so nothing needs a key. Wheel or pinch zooms.

### On a phone (375 px)

The strip folds to one **Fleet · n** button above the flight controls; opened, wing chips and orders each scroll
sideways on one row of 44 px buttons, with formation and stance as two cycling buttons and × to fold it again. The tactical view fills the screen like
the map does; every control is a button.

---

## 5. The ship brain

One brain flies every fleet ship, on either side. It knows sides, not which side is the player's, so an enemy fleet
runs the same code later (only *what orders the enemy gives* is a separate, later design). Pure TypeScript in
`src/lib/fleet/`, unit-tested; the scene only draws.

Each step, for each ship:

1. **Post.** Its wing has an anchor: pinned to the ship it follows or defends, fixed where it holds, or moved along
   the path at the slowest member's pace (and slowing when a ship lags). Its post is its formation slot on that anchor.
2. **Target.** In order: the ship an attack order names; for an escort, whoever hit the ward in the last 6 s or is
   going for it, then anything near it; otherwise, if the stance looks, the best hostile within reach of its *post*,
   scored by distance ÷ how keen its type is on that type (fighters prefer fighters, capital ships prefer capital
   ships). It keeps its target unless another scores 40% better, so it does not flicker.
3. **Decide.** Chase the target if it is within the stance's leash of the post (an ordered target or a threat to the
   ward is chased anywhere); otherwise fly to the post, matching the anchor's speed.
4. **Fly.** Fighters and cruisers make **attack runs**: in at the lead point with guns on, break off past the
   target, swing out and come in again. Capital ships close to their standoff distance and turn broadside (turrets).
   A weave (stance) is added; neighbours push apart; the heading bends round any planet ahead and straight out of
   any keep-clear zone. Turn rate and acceleration are per type (capital 0.3 rad/s, cruiser 1.3, fighter 2.6), so a
   capital ship *feels* slow.
5. **Fire.** If the stance allows (or the order is a direct attack), the target is in range, and — for fixed guns —
   within the nose cone (cruiser 0.2 rad, fighter 0.25), fire at the lead point. Capital ships have four turrets,
   two of them on point defence.

Planet safety is two layers: steering looks ahead and sidesteps, and a hard floor puts a ship back on the surface of
its keep-clear zone if it ever ends inside one. The tests fly every type straight at a planet and a wing on a path
straight through one.

**Not in the first brain:** self-preservation (pull back at low hull, which the research rates highly, section 1
point 9), avoiding enemy capital-ship arcs, collision between ships of different wings, formation turns that wheel
round the inside ship.

---

## 6. Which ship the player flies

- **Pilot to squadron leader**: the cruiser, as now; wingmen launch from its bay.
- **Captain up**: the player flies the capital ship. Its own model replaces the cruiser's, the chase camera sits
  four times further back and higher (so the whole hull and the fighters round it are in view), and it turns at 35%
  of the cruiser's rate. The cruise speed between planets stays the same for now (travel is not combat). The
  player's own guns still fire forward from the bow, and its turrets fire by themselves.
- **Later**: a bridge camera (inside, looking out the bow), and *transfer flag*: move to another capital ship of the
  armada, which leaves the old one under its own wing's orders. Flying one of your own fighters from the bay (Elite's
  model, with the crew flying the capital ship) is a good later feature; it needs crew orders for the capital ship.

---

## 7. Build order

Each step is usable on its own, and each one makes the next one possible.

1. **The brain and the orders, pure and tested** (orders, formations, target choice, steering, the step). Everything
   else is a view onto it, and it is the part most likely to be wrong, so it gets tests first.
2. **Ships in the scene**: combat.ts can spawn, remove and damage a ship that something else moves; fleet bolts are
   drawn; the brain runs each frame; hits go through combat's damage so explosions and kill counts are shared.
3. **Taking command**: the flagship is a capital ship the player flies, with its bay. Gated by the rank table.
4. **Orders from the cockpit**: command mode (C), ping (Z), the strip, the HUD line.
5. **The tactical view**: the Fleet tab with slowed time, tap-to-order and drawn paths, engagement circles.
6. **Enemy fleets on the same brain** (for testing: a nation's patrol turned loose on the flagship). Enemy
   *strategy* is not designed here.
7. Later: doctrine, missions, splitting and merging wings, transfer flag, self-preservation, bay restock and
   purchase, a second and further capital ships, saving the fleet.

**Cut from the first build**: doctrine, missions, wing split/merge, more than one capital ship in the player's
fleet, transfer flag, the bridge camera, self-preservation, saving the fleet with the journey (a reload starts with
a full bay), voice or radio acknowledgements, and the player's flagship can't be destroyed yet (its hit points stop
at 1, since there is no losing state to go to).

---

## 8. What the first build does (2026-10-18)

Steps 1 to 6 of the build order, in their first form; SPEC.md "Fleet command" has the controls and THREAD-LOG.md the
proof in numbers. The progression branch landed while this was being built and is merged in: the rank gates read its
level (`hooks.level` from GameView), fleet kills earn its XP and credits (combat's `onKill` with `by: 'wing'`), and
below Captain its own wingmen fly the cruiser's bay. The mission "Take command" is not built, so for now **level 10
is enough**: the Fleet tab shows a **Take command** button once the level is met (and, in the dev build only, a test
button below it; `__voyage.takeCommand()` does the same).

---

## 9. Decisions for Caleb

1. **Hold fire: a stance, or its own switch?** The research says keep "whether to shoot" apart from "how to fight"
   (Homeworld, Armada). As built, it is one of four stances, as you listed them. Splitting it gives three stances
   (aggressive, defensive, evasive) times two fire settings (free, hold).
2. **How do you get the capital ship?** The plan says level 10 plus a mission that hands it to you. It could instead
   be bought, or captured from another nation (which ties into conquest).
3. **Can the flagship be lost?** If yes, what happens: escape to a cruiser, or lose the fleet?
4. **Pause or slow on the tactical view?** Built as 25% with a pause button. Full pause by default would make it
   easier, slow keeps it tense.
