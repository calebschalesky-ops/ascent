# Motivation plan

Caleb, 2026-10-19: "This plan is to make sure that at no point during the game the player gets bored or doesn't have
something to do. I don't want this to be a storyline game as I would like them to have the freedom to choose what
order and in which strategy they try and take over the solar system. But there needs to be strong motivation through
the development and upgrade of your planet Earth's technology, military power, political influence etc."

Thread `motivation`, branch `claude/motivation-84a48a`, cut from integration `8caa0a9`. **DRAFT for Caleb to react to.**
Every number is a **FIRST PASS** and lives in one table, `src/lib/motivation/tables.ts`.

- The research behind it is in [RESEARCH-MOTIVATION.md](RESEARCH-MOTIVATION.md): 41 sources opened on 2026-10-19,
  each claim labelled MEASURED, STATED or WEAK, and 20 design principles. This plan cites them as **[P1]–[P20]**.
- The numbers are proved by a pure, tested model in `src/lib/motivation/` (section 8). Its full output, with every
  route's minute-by-minute log, is `integration/motivation-routes.md`.
- No astrology, no occult meaning. Gods and festivals appear only as LORE.md and PLANETS.md already use them: myth and
  cult.

**One conflict is raised here, not decided.** Progression's start screen lets the player pick any race's home world.
This plan centres on "your planet Earth", as Caleb asked. It works for an Earth start; section 9 says what changes for
the other six starts. The question for Caleb is at the end.

---

## 1. The idea in one page

The player climbs **four ladders at once, and each is tied to Earth**:

| Ladder | What it measures | Where it is in the game | How it climbs |
|---|---|---|---|
| **Pilot level** 1–10, then **Renown** | The player's own skill and record | Pilot panel | XP from fights, sites, worlds turned, diplomacy, defence |
| **Technology** 1–6 | Earth's science | The Great Library (Earth's Metropolis) | Research projects: credits up front, finished on flight time |
| **Military command** Pilot → Admiral | Earth's navy and the player's place in it | Fleet tab | Level, technology, worlds turned, helium-3, credits |
| **Influence** Outsider → Metropolis restored | Earth's standing among the colonies | Arrival cards, diplomacy screen | Influence points from holding, trading, winning and treaties |

Two **sinks** keep credits meaningful from the first hour to the last: **Earth's Works** (sixteen projects that change
the home world in ways the player can see, ending in the god-armour of Gaia) and **Holdings** (rebuilding each world
the player has turned).

Against that, a **director** decides when the solar system pushes back: relief fleets, raids on a coasting player,
a coalition, a rival commander who keeps escaping, rebellions, and one endgame crisis with a visible countdown.

The six other worlds can be taken **in any order, by any of four strategies**: military conquest, economic
domination, political vassalage, boarding and capture. Every strategy pays into the same four ladders (section 5).

Why this shape (the research in one paragraph). People want to feel competent, free to choose and connected (self-
determination theory; autonomy and competence each predict enjoyment and future play, Ryan, Rigby & Przybylski 2006,
n = 730 [P8, P9]). Dopamine tracks *surprise*, not pleasure (Schultz 1997; Berridge & Robinson 1998), so every payout
has a visible fixed floor plus a variable part [P1, P3]. People speed up as a goal gets close (Kivetz 2006: about 20%
faster) and slow down right after a reward, so the next bar is always on screen before the current one pays [P4–P6].
4X games sag in the middle and coast at the end. The fixes that worked were an external clock (XCOM 2's Avatar
Project, Stellaris's crises) and internal friction (Total War's civil war, Bannerlord's rebellions) [P11, P12]. Left 4
Dead's director varies *how often* peaks come, not how hard enemies hit [P13].

---

## 2. The progression ladder

Times are minutes or h:mm of flight from the simulated routes (section 8): **I** = Iron Fist (military, Earth start),
**C** = the Charter (economic and political, Earth start), **L** = Boarding Legion (Mars start). "Target" is the
window the rung should land in. A playtest that lands outside it is a finding.

### 2.1 Pilot level (fixes integration report finding P1)

Today the curve is 50 × L × (L − 1), topping out at 4,500. Without respawn, the world only pays 2,040 XP, so levels
7–10 are unreachable. Conquest now rebuilds navies and pays **at least 14,800 XP** for six worlds, which turns the old
curve's problem upside down: **level 10 would arrive after the second world**, and four worlds would have no level to
chase. The new curve keeps levels 2–4 as fast as today and lands level 10 near the middle of the game:

| Level | Total XP (new) | Was | Gives (progression's table, unchanged) | Lands (I / C / L) | Target |
|---|---|---|---|---|---|
| 2 | 100 | 100 | Fighter bay, a free fighter; rank Flight lead | 0:03 / 0:03 / 0:03 | 2–5 min |
| 3 | 300 | 300 | (tier 2 now comes from research, 2.2) | 0:09 / 0:10 / 0:10 | 6–12 min |
| 4 | 650 | 600 | Bay slot 2 | 0:13 / 0:12 / 0:13 | 10–18 min |
| 5 | 1,200 | 1,000 | | 0:18 / 0:19 / 0:19 | 15–25 min |
| 6 | 2,200 | 1,500 | Bay slot 3 | 0:25 / 0:39 / 0:26 | 20–45 min |
| 7 | 3,800 | 2,100 | | 0:28 / 0:59 / 0:32 | 25–60 min |
| 8 | 6,500 | 2,800 | Bay slot 4 | 0:53 / 1:08 / 0:57 | 45–75 min |
| 9 | 11,000 | 3,600 | | 1:38 / 1:56 / 1:34 | 1:20–2:10 |
| 10 | 16,000 | 4,500 | Admiral's level | 2:27 / 2:45 / 2:25 | 45–85% of the run |
| Renown 1, 2, … | every 2,500 past 16,000 | — | +5 command points and a medal each | from ~2:45 | about every 25–35 min |

**Renown** is Diablo III's paragon idea: the ladder never ends, each step is small and fixed, and it raises the
armada's cap, so late XP still buys something.

**Kill pay by time under fire** (fixes finding P2, "the safest target pays best"). Today a capital ship pays 14 XP per
second of fighting and a fighter 2. The new rule pays **10 XP for every second the balance simulator says the kill
takes** (median race, better weapon, 0.5° aim), so every target pays the same per second:

| Type | Median time to kill (s) | XP (was) | Credits (was) |
|---|---|---|---|
| Capital | 14.3 | **145** (200) | **85** (120) |
| Cruiser | 4.1 | **40** (40) | **25** (25) |
| Fighter | 5.9 | **60** (15) | **35** (10) |

A fighter pays four times what it did because race loadouts made it harder to kill than a cruiser (report finding
B1). If progression strips the fighters' shields, re-run `killPay` and the fighter's pay falls with it. The table is
computed from the simulator, never typed.

**The XP farm** (finding P1, reload). Conquest already closed it: production is the only respawn, and the state is
saved with the XP. This plan adds nothing except to keep conquest's levy rule (rebuilt ships pay half).

### 2.2 Technology: Earth's science

Tier gating moves **from pilot level to research** at the Great Library. A player who fights well but never invests
at home stays on old tech, and a player who builds Earth up out-techs a better pilot. That makes "develop Earth" a
real choice. Research is paid up front and finishes on flight time while the player does other things: an open loop
with a bar always on screen [P4, P20].

| Tech | Credits | Research (min) | Needs | Gives | Lands (I / C / L) |
|---|---|---|---|---|---|
| 1 | — | — | | Tier-1 modules (the start) | 0:00 |
| 2 | 250 | 6 | | Tier 2: plasma, swarm, mines, capacitor, heavy plating, chaff, attack drone | 0:20 / 0:20 / 0:21 |
| 3 | 700 | 10 | | Tier 3; Mk II shields and reactor; swarm-drone racks | 0:41 / 0:46 / 0:38 |
| 4 | 1,500 | 15 | **helium-3** | Torpedo; Mk III targeting; the capital ship's fusion drive | 1:09 / 1:23 / 1:10 |
| 5 | 3,000 | 20 | **two worlds turned** | Mk III shields and reactor; boarding drills; drop pods | 1:37 / 1:52 / 1:40 |
| 6 | 5,000 | 20 | | **The Aegis of Gaia**: Earth's god-armour wakes (home defence for the crisis) | 2:15 / 2:47 / 2:24 |

Helium-3 at tech 4 is the first **strategic gate**. Earth has none (CONQUEST.md 3.1: it imports it from the Moon).
The player gets it by **taking a helium-3 works** (Moon, Jupiter, Saturn), **a trade pact with the Moon** (influence),
or **making the Moon a vassal**. Three routes to one key: the gate pushes the player outward without dictating how.

### 2.3 Military command: cruiser → bay → destroyer and drones → capital ship → armada

Fleet-command's ranks with the unlock step it lacked (finding P3: "capital ship and armada have no step").

| Rank | Unlocked by | Gives | Lands (I / C / L) | Target |
|---|---|---|---|---|
| Pilot | start | Your race's cruiser | 0:00 | |
| Flight lead | level 2 | Bay, one free fighter, two orders | 0:03 | 2–5 min |
| Squadron leader | level 4, tech 2, a site held | Bay of four; a **swarm-drone rack** (16 drones, destroyer-hangars.md) can replace fighters | 0:20 / 0:21 / 0:22 | 15–30 min |
| Wing commander | level 5, tech 3, a site held, **1,000 credits** | A **destroyer** escort from Pharos Yard; **infantry dropships** fit the cruiser bay (2 slots each) | 0:44 / 0:51 / 0:45 | 35–60 min |
| **Captain** | level 7, tech 4, **one world turned**, **helium-3**, a site held; then the mission *Take command* (escort a capital ship home, about 6 min) | **The capital ship**: full orders, formations, the tactical view | 1:17 / 1:32 / 1:20 | 1:00–1:45 |
| Commodore | level 8, tech 5, two worlds turned, **3,500 credits** | A second capital ship; **drill boarders**; detached missions | 1:44 / 1:56 / 1:44 | 1:30–2:15 |
| **Admiral** | level 10, three worlds turned | **The armada**: 100 command points, +15 per world turned, +5 per Renown; transfer flag | 2:27 / 2:45 / 2:25 | 2:00–3:00 |

What changed from fleet-command's table: Captain moves from level 10 to **level 7 plus a world and helium-3**, because
at level 10 the capital ship would arrive with half the game gone. Conquest's own rule (level 8, a held shipyard, a
helium-3 source) is close. This plan replaces "a held shipyard" with "one world turned by any route", so a political
player can get there. **Earth's own Pharos Yard counts as the shipyard for an Earth start.** Admiral keeps conquest's
"three worlds", counted as *turned* rather than *controlled*.

Caleb's order puts boarders and infantry carriers with the armada. This plan follows it but moves **infantry
dropships to Wing commander**, because troops are how forts and capitals fall in conquest and the bay already holds
them (destroyer-hangars.md: 2 slots). **Drill boarders stay at Commodore.** Section 8.4 shows what that costs the
boarding strategy.

### 2.4 Influence: Earth's standing

| Standing | Reached at | What it opens |
|---|---|---|
| Outsider | start (Earth starts with 60 influence: the mother city's name still opens doors) | Envoys and trade pacts |
| Envoy | 50 lifetime influence | Truces (a world stops attacking for 30 min) |
| Broker | 150 | Vassal demands |
| Hegemon | 350 | Alliances (a pact held 60 min) |
| Archon | 650 | Breaking a coalition (peel one member out) |
| **Metropolis restored** | every world turned, by any route | The end: the colonies honour the mother city again (LORE.md, "The Founding") |

**Earning influence:** 50 per world turned (any route), 3 per site taken, 0.15 a minute per site held, 1.5 a minute
per pact, 1 a minute per vassal, 10 per threat repelled, 30 for the rival's defeat, 20 per trade convoy.
**Spending it:** trade pact 60; vassal demand 70 + 25 per world already turned; alliance 200; breaking a coalition 120;
pacifying a rebellion 50 (honour the temple instead of fighting).

### 2.5 Earth's Works: the home world you can see

Sixteen projects, paid once each and never gated. Each changes Earth in a way the player sees on the next visit, and
adds a little power (0.02–0.03). The first costs 300 and the last 9,500. Examples: Charter Guard drill yard (a home
patrol cruiser), Pharos Yard second slip (fighters 20% cheaper), the Great Library annex (research 15% faster), the
Exchange floor (+15 credits a minute at home), the Temple of Gaia restored, five plates of the Aegis (Earth's
god-armour station, built by god-armour), the Metropolis lights (the night side lit in the player's colour), the
Charter Hall (seats for the seven worlds, for the end). Full list in `WORKS`.

This is where "the development of your planet Earth" shows. Its other job is **the purchase-horizon rule**: there is
always something to save for.

### 2.6 Holdings: rebuilding what you took

Each turned world has four projects: restore the temple (900), reopen the market (1,600), rebuild the walls (2,600),
seat its council in the Charter Hall (4,000). Each lowers unrest and raises its pay. This answers PLANETS.md open
question 2, and it is the late game's credit sink: by hour 4 the routes earn 350–870 credits a minute, which would
otherwise pile up unspent.

### 2.7 What a whole game looks like on the ladders

| | Hour 1 | Hour 2 | Hour 3 | Hour 4 | End (4:23–4:39) |
|---|---|---|---|---|---|
| Iron Fist | L8, T3, Wing cdr, 2 worlds | L9, T5, Commodore, 3 | L10, T6, Admiral, 4 | Renown 3, 5 worlds | 6 worlds |
| Charter | L7, T3, Wing cdr, 1 world, 2 pacts | L9, T5, Captain, 4 | L10, T6, Admiral, 5 | Renown 2, 5 | 6 |
| Legion | L8, T3, Wing cdr, 2 worlds | L9, T5, Commodore, 4 | L10, T6, Admiral, 4 | Renown 3, 5 | 6 |

---

## 3. Reward systems

### 3.1 The rhythm

| Scale | How often | Fixed part (always shown in advance) | Variable part | Sources |
|---|---|---|---|---|
| **Moment** | every 1–3 s in a fight | Hit flash, shield bubble, damage number, lock tone | Crits are not proposed: hits are deterministic and readable | [P2, P9] |
| **Kill** | every 20–60 s in a fight | Kill pay by type (2.1), shown on the target card before you fire | **Salvage**: crate 25% (15–60 credits), module part 6% (120–200 off the next purchase), relic 1.2% (a named module one tier above what is on sale) | [P1, P18] |
| **Site** | every 1–3 min in a siege | Conquest's site XP and credits, plus a new income line | Which building's treasury you find (Treasury Row's 600 is the famous one) | CONQUEST.md 2.1 |
| **Milestone** | every 3–13 min (rule 6.1) | A rung: level, rank, tech, standing, a station broken, yards silenced, pact, ultimatum | None: milestones are promised, never rolled | [P4–P6] |
| **Session** (~45–60 min) | about once an hour | A world turned, a rank, a tech tier; one Works project | The rival's dossier grows; what he says depends on what you did | [P19] |
| **Planet** | 25–80 min each | The fall sequence (3.4) | Which garrison ships survive to join you | |

The **fixed floor** rule [P1]: the target card shows the exact kill pay, a site shows its XP and income before the
hold starts, and a research project shows its finish time. Pay never comes in under what was shown. Salvage only ever
adds. The odds are printed in the codex [P18]. "Floor plus surprise", and nothing hidden.

### 3.2 Bars on screen

Always visible (pilot panel, top right, four thin bars): **level** (XP to next), **research** (minutes left),
**the next rank's checklist** (each condition ticks green), **standing** (influence to next). The arrival card at a
world adds **its conquest bar** (sections, yards, works, forts, capital as segments) and, for an economic player, **its
economy meter falling** under blockade (PLANETS.md).

Two rules from the goal-gradient research [P5, P6]:
- **Pre-filled starts.** A new rank's checklist opens with the conditions the player already meets ticked: often two of
  four. This is honest pre-fill; nothing is faked.
- **Stagger.** Two bars never complete on the same frame unless the events really coincide. When a world falls, the
  level-up toast waits until the fall sequence ends. The simulator logs where several land at once; the HUD queues
  them 2 s apart.

### 3.3 Achievements

Local only, shown in a codex, no pop-up spam, never tied to playing on a schedule. They reward **skill and variety,
not grind** [P3, P9]:

| Achievement | Rule |
|---|---|
| Clean hands | Take a world without losing a fighter |
| The long way round | Turn a world by each of the four strategies in one game |
| Every road to helium | Reach tech 4 without taking a helium-3 works (pact or vassal only) |
| Starve them | Turn Venus by cutting its power (take Mercury, or blockade) without touching its capital |
| Walk with Lakedaimon | Take Mercury's walking city before it reaches the dawn line |
| Treasury Row | Take the Moon's treasuries (600 credits) |
| The rival's own blade | Defeat the rival and fit his relic |
| No one left behind | Survive the Grand Armada with every capital ship alive |
| Peace at home | Hold every conquered world with no rebellion for 60 min |
| Mother city | Reach Metropolis restored |
| Six by spring | Finish in under 4 h of flight |
| Boarding party | Take a capital ship by boarding without losing a boarder |
| One of each | Order fighters, a destroyer, drones, dropships and boarders in one battle |

### 3.4 When a planet falls

The biggest payoff in the game, built as one sequence that the director protects: **no threat may start during it**
(`onTurned` sets the relax gap).

1. The capital's hold bar fills, and the world's gun batteries go quiet.
2. The arrival card flips: **"Held by: you (taken from the Quirites)"**, with the world's own words of surrender in
   LORE.md's voice.
3. Its patrol **stands down and joins you** as a garrison (conquest). The player sees ships change colour in formation.
4. The **god-armour station lights in Earth's colours**, plate by plate (god-armour).
5. Tallies: XP (500 plus everything the siege paid), the world's income now running, influence +50, the rung.
6. The map recolours. Every other world's mobilisation number ticks up visibly. That foreshadows the pushback.
7. Two choices appear: **Holdings** (rebuild the temple first or the market first) and **next target**, with each
   world's threat rating shown [P7].

---

## 4. Antagonist moments

The director (`director.ts`) starts at most one threat at a time. It never starts a fight within **3 minutes** of the
last one ending (Left 4 Dead's relax [P13]), and never during a planet's fall.

| Moment | Trigger | How often | What the player does | Pays |
|---|---|---|---|---|
| **Relief fleet** | A world turned: a neighbour or its old enemy (LORE.md) strikes it 8–14 min later | Once per world turned | Defend the new holding (a cruiser and 3 fighters, ~6 min) | Kills at levy pay, influence 10 |
| **Raid on a coasting player** | Dominant (power ÷ next target ≥ 1.6), a world turned, and nothing has pushed back for 12 min | At most every 12 min while dominant | Defend a held site or Earth (2 cruisers, 2 fighters, ~5 min) | Kills, influence 10 |
| **Coalition** | Two worlds turned | Forms once; re-forms after the next world turns if broken | The free worlds' yards build 25% faster; joint raids every 25 min (a capital, 2 cruisers, 4 fighters, ~7 min) | Each raid repelled pays; Archons can break it with 120 influence |
| **The rival** | The first veteran patrol you break: its commander escapes at 20% hull | Returns about every 35 min; escapes twice, then a duel | He hunts you with a named capital ship and two fighters | Escapes pay influence 10; the duel pays a relic and influence 30, and is a rung |
| **Rebellion** | A controlled world's unrest ≥ 0.5 and held for 20 min | At most once per world per 40 min | Retake a fort from militia (~6 min), or pacify for 50 influence | Kills; unrest −0.25 |
| **The Grand Armada** (endgame crisis) | Four worlds turned: announced with a **12-minute countdown** on screen | Once | Three waves at Earth, 6 min each, each wave a rung | 800 XP, 1,500 credits, influence 60; the free worlds' yards build 20% slower after |

Measured on the three routes (section 8): the coalition forms at 1:04–1:56, the crisis is announced at 1:53–2:06 and
broken at 2:25–2:45, and the rival dies at 2:41–2:52. The first rebellion comes at 0:47 on the conquest routes and
never on the Charter route, because vassals do not rebel.

### 4.1 Rules the director keeps

- **Threats interrupt winning, not struggling.** If the player has gone 15 minutes without a rung *and is not
  dominant*, the optional threats (raid, coalition raid, the rival) wait. A dominant player who has stopped climbing
  is coasting, and gets pushed. Relief fleets, rebellions and the crisis come regardless, because they follow from
  the player's own actions. This rule came out of the simulation (8.3).
- **Pacing, not difficulty.** The director changes how *often* threats come, never how strong a given threat is. That
  is Booth's L4D rule [P13]. Threat sizes are fixed per kind, so the player learns them.
- **Clocks run on flight time only** and show on screen. The crisis countdown is visible from the moment it starts.
  Nothing advances while the game is closed [P11, P20].
- **Wealth and progress, not wall time**, set the escalation: mobilisation per world turned (conquest's 20%) and enemy
  fits improving 15% per world turned (enemy-ai's levels). This is RimWorld's wealth dial [P15], keyed to worlds.

### 4.2 The rival commander, and the Nemesis patent

The rival is a single named commander (one per generation): a dossier on the codex page, lines that refer to what the
player did last time ("you burned the Navalia; I watched from the Limes"), a named capital ship that gains one module
each time he escapes, and a successor from the coalition's strongest world after his duel. Warner Bros holds a patent
on the Shadow of Mordor Nemesis system (US 10,926,179 B2, granted 2021-02-23, expires about 2036-08-11). The
research did not read its claims in full, so this is caution, not legal advice: **do not build a procedurally
generated hierarchy of NPCs that promote, rank and reshuffle from their encounters with the player.** One authored
rival at a time, with a memory of events, is a long-standing pattern (FTL's rebel flagship, any recurring boss). Get
the claims read before shipping anything closer.

### 4.3 Snowball, measured

Without the pushback the player wins too easily. The first simulator run, before any of section 4 or the enemy-tech
dial, ended at **1.8–2.8 hours with player power at 26–92×** the start. With them, power at the end is 12–16× and the
last two worlds take 0:50–1:40 each, which is the hardest stretch of the game. Section 8.3 lists every change.

---

## 5. Freedom without a storyline

**Any order.** Every world can be the first target. The arrival card shows each world's **threat rating** (its
conquest time over Mars's: Mars 1.0, Moon 1.0, Mercury 1.0, Venus 0.9, Earth 1.1 for other starts, Saturn 1.7, Jupiter
2.1) and what taking it gives (helium-3, hydrocarbons, power, a lifeline cut). The player picks their own difficulty
by picking where to go [P7]. The three routes start at Mars, Mercury and the Moon, and all three pass every rule.

**Four strategies, one set of ladders.** Each turns a world a different way. All of them pay the same 500 XP and 50
influence for a world turned, and every strategy reaches every ladder's top (rule 6.9).

| Strategy | Turns a world by | Its own activity | How the ladders still flow | Its cost |
|---|---|---|---|---|
| **Military conquest** | Taking the capital once the forts are down (conquest's control) | Sieges | Site XP is the biggest XP source (12,860 on Iron Fist) | Rebellions (unrest), the most relief fleets |
| **Economic domination** | Cutting a world off: every supplier yours (conquest's trade table), its station broken, then a blockade | **Convoys** between partner worlds (credits, XP 60, influence 20), freighters seized in blockades | Diplomacy XP (7,162 on the Charter), pacts as rungs | Lower income (vassal tribute is half) |
| **Political vassalage** | Ultimatum: station broken, yards and two works taken *or* cut off, 18-min blockade, then a demand; the world holds out 12 min | Diplomacy, blockades, ultimatums | A vassal's surrender pays its untaken sites' XP at 75%; an alliance pays 1,500 | Influence; the demand gets dearer with every world turned |
| **Boarding and capture** | As conquest, but capital ships and cruisers are taken whole | Boarding fights inside hulls (infantry-carrier's model) | Boarded ships pay 1.5× and join the fleet (+3% power each, up to 20) | Boarders only from Commodore (1:44); see 8.4 |

The **Charter** route mixes the economic and political strategies: pacts with the Moon and Saturn become alliances,
and four worlds become vassals. On the **Legion** route the player conquers until Commodore, then boards.

**What no strategy can skip:** each world's god-armour station (its sections must fall before a blockade bites) and
the Grand Armada.

**Structure without story** [P19]: each people gets a 3–4 step reactive arc that opens on first contact, a pact or a
siege, in any order. The Moon's oracle answers a question you choose; Mars's Senate votes on war with you; Jupiter's
king sends his companions to duel. Races-in-depth and planets own the text. This plan asks only that each arc pays a
rung.

---

## 6. Anti-stagnation rules

Each rule has a number, and `rules.ts` checks it against every simulated run. A playtest checks the same numbers on a
real save, with the HUD's event log as the timeline.

| # | Rule | Number | Measured (seed 1; all 60 sweep runs pass) |
|---|---|---|---|
| 6.1 | **A next goal is always close**: a new rung (level, Renown, rank, tech, standing, Works project, station broken, yards silenced, pact, ultimatum, world turned, crisis wave, rival defeated) | within **13 min** before the first world turns, **25** until four have, **45** after | pass, all runs |
| 6.2 | **Never long without a meaningful reward** (a rung, a site, a purchase, a part or relic, a threat repelled, a convoy, a seized freighter) | **4 min** in the first 30 min, **8** to hour 3, **12** after | pass, all runs |
| 6.3 | **A threat whenever the player is dominant and coasting**: dominant = power ÷ next target ≥ 1.6, with a world turned | a threat within **15 min** of the last threat or world falling | pass (longest calm 10.3–11.8 min) |
| 6.4 | **Relax after a peak** | **3 min** from a threat's end to the next fight, and none during a planet's fall | pass (3.0 min shortest) |
| 6.5 | **Always something to save for** (module, research, rank, Works, Holdings, armada ship) | from minute 5, at most **10 min** of current earning away | pass (worst 4.9–5.4 min) |
| 6.6 | **Variety**: fight, siege, diplomacy, economy, defence | at least **2 kinds** in every 60-min window | pass (fewest 4) |
| 6.7 | **Levels matter all game** | level 10 lands between **45% and 85%** of the run | 53–63% |
| 6.8 | **Length** | a whole game is **4–10 h** of flight | 4.4–4.7 h (sweep 4.1–4.8) |
| 6.9 | **Every ladder tops out on every route** | level 10, tech 6, Admiral, Metropolis restored | pass |
| 6.10 | **Farming is worse than progressing** (conquest's band) | farming XP/min ≤ 0.6 × taking XP/min | conquest's run: 12–20 vs 103–197 |
| 6.11 | **Nothing punishes stopping** | no clock, income or production runs while the game is closed; no streaks, dailies or decay | design rule; conquest's clock is flight time |

Rules 6.1–6.9 run on every `npx vitest run`, and the test fails if any route breaks any rule on more than one of ten
seeds.

---

## 7. Playthrough guide

Three routes, each simulated to the end. The tables below are condensed from `integration/motivation-routes.md`,
which has the full logs.

### 7.1 Iron Fist: military conquest from Earth (4:39)

Order: Mars (the old war), the Moon (helium-3), Mercury, Venus, Saturn, Jupiter.

**The first hour, minute by minute (selected):**

| Min | What happens | Why it holds the player |
|---|---|---|
| 0 | Seeker missile bought with the starting 100 | A purchase in the first minute |
| 3 | Level 2: the bay opens, a free fighter, rank Flight lead | The first big rung in 3 minutes |
| 3–10 | Skirmishes with Mars's patrol, one ship at a time; armour, targeting, flares, railgun, repair drone bought | A purchase every 1–2 minutes; salvage parts at 8 |
| 9 / 13 | Levels 3 and 4 | |
| 11 | First site: a Limes battery | Conquest opens |
| 13–17 | Four sections of Mars's god-armour (Ares) station; **the station is broken** at 17 | The first planet-scale moment |
| 14 | Research on tech 2 begins | A second bar starts filling |
| 18–20 | Foundry and Navalia taken: **the yards fall silent**; Earth's Works 1 | Production stops: the levies stop coming |
| 20–21 | Tech 2; rank Squadron leader; plasma bolt | Three rungs in two minutes after a lull |
| 21–26 | Works, both castra, Colonia Tharsis, the Quirinal: **Mars controlled** at 26:48 | The planet falls (3.4) |
| 29–37 | The Moon's station broken, its yards silent; standing Broker | The second world goes faster: power 3.5× |
| 38 | **Relief fleet strikes Mars** (the first pushback) | The holding must be defended |
| 41–44 | Tech 3; **Wing commander**: a destroyer joins, dropships in the bay | |
| 47 | **Rebellion on Mars** | Inner friction: the new world resists |
| 53 | Level 8; **the Moon controlled**; helium-3 is Earth's | The capital ship is now one tech away |
| 57 | **The coalition forms** | The solar system names you the threat |

**Hour by hour:**

| Hour | Ladders at the end | What happened |
|---|---|---|
| 1 | L8, T3, Wing cdr, Broker, 2 worlds, 242/min | Mars and the Moon taken; first relief fleet, first rebellion, the rival escapes |
| 2 | L9, T5, Commodore, Archon, 3 worlds, 444/min | Coalition forms; tech 4, **Captain at 1:17**; Mercury falls; the rival escapes again; Venus's station and yards fall |
| 3 | L10, T6, Admiral, 4 worlds, 646/min | Venus falls; **the Grand Armada is announced**, the Aegis wakes, three waves broken by 2:45; **the rival dies in a duel**; Renown 1 |
| 4 | Renown 3, 5 worlds, 802/min | Saturn's station, yards and capital; Earth's Works 7–11; coalition raids and raids keep coming |
| 4:39 | Metropolis restored | Jupiter, the hardest world, after a 1:19 siege |

### 7.2 The Charter: trade, vassals and alliances from Earth (4:23)

Pacts with the Moon and Saturn (they become alliances); Mercury, Venus, Mars and Jupiter become vassals.

| Min / h | What happens |
|---|---|
| 0:03 | Level 2, Flight lead |
| 0:06 | **Trade pact with the Moon**: helium-3 flows to Earth, 20 credits a minute, the Moon stops fighting you |
| 0:12–0:24 | Mercury's batteries and station (broken at 0:19), its yards (silent at 0:22), two works |
| 0:27 | **Trade pact with Saturn**: hydrocarbons; Mercury is now cut off on two of three suppliers |
| 0:30–0:59 | **Blockade of Mercury**: a freighter seized every 3 minutes; tech 3; the **ultimatum** at 0:47; Wing commander at 0:50; **Mercury swears fealty** at 0:59 |
| hour 2 | Venus broken and blockaded; the Moon becomes an **ally** (1:08) and so does Saturn; **Captain** at 1:32 without having stormed a capital; Venus swears fealty; the coalition forms at 1:56 |
| hour 3 | The Grand Armada at 1:56–2:27; Mars's station broken; ultimatum; **the rival dies** at 2:44; Mars swears fealty; **Admiral** at 2:45 |
| hour 4–4:23 | Jupiter is cut off (its only supplier, Saturn, is your ally): station broken, blockade, ultimatum, fealty. **Metropolis restored.** |

This route earns less (128 credits a minute at hour 1 against Iron Fist's 242) and gets its XP from diplomacy (7,162)
instead of sites. It reaches every rung, just later: level 10 at 2:45 against 2:27.

### 7.3 Boarding Legion: from a Mars start (4:35)

A Quirite pilot. Order: the Moon (helium-3), Earth (the largest navy; LORE.md's "decayed empire"), Venus, Mercury,
Saturn, and Jupiter, the old enemy, last.

| h:mm | What happens |
|---|---|
| 0:03–0:27 | As Iron Fist, on the Moon: bay, station broken at 0:17, yards silent at 0:21, **the Moon controlled at 0:27** |
| 0:27–0:57 | Earth's Lagrange Guns, Earth's god-armour of Gaia broken (0:37), Pharos Yard silenced, the relief fleet, a rebellion on the Moon, **Earth controlled at 0:57** |
| hour 2 | Captain at 1:20; Venus at 1:27; **Commodore at 1:44**: drill boarders. From here, Saturn's and Jupiter's veteran capital ships and cruisers are boarded, not destroyed |
| hour 3 | The Grand Armada (announced 1:53, broken 2:25); Admiral 2:25; the rival dies 2:41 |
| 4:35 | Jupiter, the old enemy, falls last |

---

## 8. Proving the numbers

### 8.1 The model

`src/lib/motivation/`, pure TypeScript, not wired into the frame loop. It is the spec other threads build to.

- `tables.ts`: every number in this plan. Mirrors of unmerged threads' numbers are marked with where they come from.
- `ttk.ts`: runs the **balance simulator** (`engageMany`, the game's own missile, dodge and hit code, with each race's
  loadout through `craftStats`) for every nation and type, and computes kill pay from it.
- `director.ts`: the antagonist director (section 4).
- `sim.ts`: plays a whole game at the level of decisions. Fights cost the simulator's time to kill. Sieges cost
  conquest's measured conquest time per world (CONQUEST.md 9.1), stretched ×2 because enemies now shoot back, and
  divided by the player's power over the world's hardness.
- `rules.ts`: the anti-stagnation rules (section 6) against a timeline.
- `report.ts`: the three routes, a seed sweep, the markdown report.
- `motivation.test.ts`: 15 tests. Tables, kill pay, six director tests, and every route passing every rule.

Run it: `MOTIVATION_OUT=integration/motivation-routes.md npx vitest run src/lib/motivation`.

### 8.2 What it does not know

It is a pacing model, not a player. It assumes a competent pilot at 0.5° aim, no deaths, a sensible shopping order,
and one fixed route policy. Travel is 1 minute (planet scale measured the whole ten-stop tour at 99 s). A real first
game will be slower, maybe 1.5×, which still fits the 4–10 h band. Its numbers set the *shape* and the *bands*; the
first playtest sets the scale. Mirrored numbers (conquest's sites, planets' resolve, fleet-command's ranks) must be
swapped for imports on merge.

### 8.3 What the runs changed

The rules were written before the first run. The first run failed almost all of them, and each failure became a
design change, not just a tuned number:

| Run | Failure | Change |
|---|---|---|
| 1 | Game over in 1.8–2.8 h; power 26–92× (the 4X snowball) | Enemy fits improve 15% per world turned; rank power capped at 2×; armada power capped at +60%; god-armour stations as 4 sections per world |
| 1 | Nothing to buy while research runs, or while waiting for helium-3 | Earth's Works (2.5): an always-open sink that develops the home world |
| 2 | A raid landed the minute a world fell | A world falling is a peak: the relax gap starts there (3.4) |
| 2 | Credits pile up late (700+ a minute, nothing to spend on) | Holdings (2.6); Renown raises the armada cap |
| 2 | The boarding route farmed endless levies and never won (20 h) | Levies are fought only when three gather; the player goes for the yards |
| 3 | A 24-min crisis with no milestone in it | Three waves, each a rung, and a rung when it breaks |
| 3 | Level 10 at 30–40% of the run | The XP curve above level 7 steepened twice, then Renown added |
| 4 | Mid-game gaps between worlds | Two per-world milestones: the station broken, the yards silenced |
| 5 | Threats crowding out progress | Stall-hold: optional threats wait while a struggling player has had no rung for 15 min, but not while a dominant one coasts |
| 6 | The economic route idled with no trade partner, then ran 30% faster than conquest | Convoys; blockades on planets' measured siege curve (18 min); the ultimatum; demands that cost more each time; allies' fleets fight beside you; isolation only once the station is broken |
| 7 | The rival never appeared on two routes | He escapes when the *veteran* patrol breaks, not when every levy is dead |

Thresholds changed after the first run, each with its reason in `tables.ts`. The length band was written as 6–14 h
and became **4–10 h**: conquest's own band is 8–30 min a world, and a flight game should not be stretched to a 4X's
length to meet a guess. The next-goal rule was first keyed to the clock (10 min in the first hour) and is now keyed to
the stage, **13 / 25 / 45 min** by worlds turned, because the routes reach the late game at different times. The early
limit of 13 is what the political route's first blockade needs. The late raid window went from 9 to 12 min, because at
9 a third of the late game was spent on defence.

**Robustness:** across 10 salvage seeds per route, 30 of 30 runs pass every rule. With a second time-to-kill table
(simulator seed 2), another 30 of 30 pass. Before the last fix in 8.3 the second table gave 29 of 30.

### 8.4 What the model says about Caleb's order

With boarders at Commodore (1:44), the Legion route boards only Saturn's and Jupiter's veteran hulls. Boarding is
**676 of about 27,700 XP** and the route plays like Iron Fist with a different start. Infantry dropships at Wing commander
(0:45) already let troops take forts. If boarding is meant to be a whole strategy and not late flavour, drill boarders
should come at Captain (about 1:20). This is open question 2.

---

## 9. Earth start and the other six starts

The plan is written for Earth. What changes for another home:

| | Earth start | Any other start |
|---|---|---|
| The home world | Earth; Works are Earth's (Pharos Yard, the Aegis of Gaia, the Charter Hall) | That world; Works use its own buildings from PLANETS.md (Mars: the Navalia, the Fabrica, the Aegis of Ares) |
| Starting influence | 60 (the mother city) | 20 |
| Helium-3 for tech 4 and Captain | Imported from the Moon: take, trade or vassalise | Moon, Jupiter, Saturn starts have it at home: **tech 4 and Captain come 10–20 min earlier**; Mercury, Venus and Mars import it like Earth |
| Earth itself | Home, never a target | **A target**: the largest navy, threat 1.1, conquest's sites; LORE.md's "decayed empire" |
| Lifeline | None (Earth lives in the open) | The home's lifeline (PLANETS.md 1.5) becomes a **home defence target**: raids aim at it, so the director's pushback has teeth |
| The end state | "Metropolis restored": the colonies honour the mother city | Needs a new name per people (the Senate's *imperium*, the Diadochoi's *basileia*); races-in-depth should name it |
| Old enemies | Mars ("old war") | LORE.md's table: Mars ↔ Jupiter, Moon ↔ Venus; the relief fleet comes from the old enemy |

The Legion route is the proof for a Mars start: it passes every rule.

---

## 10. Hand-offs

Also in the notes folder as `motivation-handoffs.md`.

| Thread | What it would change for this plan to hold | Where |
|---|---|---|
| **progression** | XP curve `[0,100,300,650,1200,2200,3800,6500,11000,16000]` and Renown every 2,500; kill pay from `killPay` (10 XP a combat-second); tech tier gated by research, not level; a pilot-panel strip with four bars; the rank checklist pre-filled | `levels.ts`, `economy.ts`, `PilotHud.tsx` |
| **conquest** | Earth (the home) pays a home budget (15 + 10 × standing a minute) instead of nothing; god-armour stations as 4 sections a world, before the foundry; isolation as a vassal condition; blockade 18 min and ultimatum 12; the capital-ship step as 2.3 (one world *turned* instead of a held shipyard; the home yard counts); relief fleets 8–14 min after a world falls | `unlocks.ts`, `state.ts`, `sites.ts` |
| **planets** | Holdings (four per world) answer open question 2; unrest ≥ 0.5 for 20 min triggers a rebellion, cooldown 40; the economy meter drives the blockade bar; vassals do not rebel | `state.ts`, `buildings.ts` |
| **stations / god-armour** | Station sections as capture targets (4 a world for now); Earth's Works plates on the Aegis of Gaia; "lights in Earth's colours" on a fall; the Aegis wakes at tech 6 for the crisis | hardpoints, systems |
| **fleet-command** | The rank table in 2.3 (Captain at level 7 + a world + helium-3 + mission; Admiral's cap +15 a world, +5 per Renown); the tactical view opens at Captain | `src/lib/fleet/command.ts` |
| **enemy-ai** | Fit level rises 15% per world turned (its levels 1–5 by worlds, not by nation); the rival's named capital ship gains a module each escape; threat sizes fixed per kind | `aiKnobs.ts`, `enemyArms.ts` |
| **arsenal** | Tiers 1–6 by research; relics are named modules one tier above what is on sale; salvage parts lower the next price | `tech.ts` |
| **destroyer** | The Wing commander's escort | `hangars.ts` unchanged |
| **drone-swarm** | The rack at Squadron leader (16 drones in a cruiser bay) | — |
| **infantry-carrier** | Dropships at Wing commander; forts and capitals take 30% less hold time with troops | `src/lib/infantry/` |
| **drill-boarder** | Boarders at Commodore (or Captain, question 2); boarded hulls join the fleet, pay 1.5× | — |
| **races-in-depth** | A 3–4 step arc per people that pays a rung; a name for "Metropolis restored" for each other start | — |
| **A new director thread** | Wire `director.ts` into the frame loop with real intensity inputs | `components/director.ts` (new) |

---

## 11. What is left out on purpose

The game is single-player and local, and no money changes hands. The psychology is used to make the game compelling
while it is played, never to sell anything or punish stopping. Two tests from the research apply to every hook:
**the quit test** (does closing the game for a week cost the player anything? It must not) and **the liking test**
(would the player still choose this if they could see how it works? Odds, floors and clocks are shown).

Left out: loot boxes and any paid randomness; daily logins, streaks and dailies; energy or stamina; timers that run
while the game is closed; decay of anything while away; FOMO events; pay-to-skip; near-miss animations on salvage;
variable-ratio payouts with no floor; hidden odds; artificial grind walls. The evidence and the reasons are in
RESEARCH-MOTIVATION.md Part C. Where the research says the pop accounts overstate (that "dopamine = pleasure", that
variable rewards are addictive by themselves, the Zeigarnik memory effect), this plan does not rely on the overstated
version. It uses the resumption tendency, which did replicate: load the player beside their unfinished project, with
the next step shown [P20].

---

## 12. Open questions for Caleb

1. **Earth only, or any of seven homes?** (Section 9.) The plan works for both. Earth-only makes the Works and "the
   mother city" story sharper; seven starts give replay.
2. Should drill boarders come at Captain (1:20) so boarding is a whole strategy, or stay with the armada as you listed?
3. Is 4–5 hours of flight the right length for a whole game, or do you want it longer (slower sieges, more worlds such
   as the belt or Jupiter's moons as separate holdings)?
4. Should research gate tech tiers (this plan) or should pilot level keep gating them (progression today)?
5. The rival: one at a time as proposed, or none until the patent question is read properly?
6. Can a world be lost back (a rebellion that wins, a vassal that defects to the coalition)? The plan says no for now.
