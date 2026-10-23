# Endgame expansion: the contract every section follows

Caleb asked on 2026-10-20 for ENDGAME.md "expanded 10x". It is split into eight files, written in parallel:

| File | Covers |
|---|---|
| `endgame/00-system.md` | The beats that every house shares, the director, the coalition, the betrayal, the Katabasis rules, exile, the endings, a shared event deck, two worked playthroughs |
| `endgame/earth.md` | Earth (Humans) |
| `endgame/moon.md` | The Moon (Selenitai) |
| `endgame/mercury.md` | Mercury (Hemerodromoi) |
| `endgame/venus.md` | Venus (Nephelai) |
| `endgame/mars.md` | Mars (Quirites) |
| `endgame/jupiter.md` | Jupiter (Diadochoi) |
| `endgame/saturn.md` | Saturn (Autochthones) |

## Sources: read these first, and contradict none of them

- The lore: `<repo>\LORE.md`. Read the whole thing,
  especially your house's section and "Who stands where".
- `<repo>\FEUDS.md`: the win, standings, blood and claim feuds, Mercury and Moon rules.
- `<repo>\ENDGAME.md`: the castes table, the beats, the Katabasis twists, the rival,
  losing.

**If your section and one of those disagree, the source wins.** Where you have to invent, invent inside the lore.

## Settled rules

**What Caleb has ruled**
- The only win is holding all seven capitals by conquest. There is no voting and no seat you are elected to. Allies
  are temporary. Some feuds never end.
- The themes come from Red Rising: castes, an orbital drop, betrayal by an ally, a rising from below. **Use no name,
  term, character or line from those books.** Use historical Greek, Roman and Byzantine terms, and LORE.md's own.
- No astrology and no occult meaning. Gods appear only as myth and cult, the way LORE.md uses them.

**Defaults for the questions Caleb hasn't answered.** Use them, and mark each place one matters with
`(default, open)`.
1. Chains or broken is chosen on every world you take. The player's starting house sets the price.
2. The rival's sex and name are rolled each game from a short list per house. Write their lines with no gendered
   pronouns, using they/them or the title.
3. Losing your home world means exile, not game over. Losing every world is game over.

## Numbers

Every number is **FIRST PASS** and goes in the record (section F of the template), not scattered through prose. Keep
them in the scale the game already uses:
- A cruiser kill pays 25 credits and 40 XP. A capital kill pays 120 credits and 200 XP.
- Each house fields about 7–8 ships: a capital, a destroyer, two cruisers and four fighters.
- Standing runs -100 to +100. The bands are: Blood feud (locked), Hostile ≤ -40, Wary -39 to 19, Friendly 20–59,
  Allied ≥ 60.

## Effects: use only this vocabulary

So that a build thread can turn every card into data, every choice's effects come from this list. If you truly need
something that isn't here, add it in your file under "New effects needed" with one line on what it does.

```
standing(house, ±n)          credits(±n)             xp(±n)
unrest(world, ±n)            garrison(world, ±n)     income(world, ±n%)
troops(±n)                   ships(type, ±n)         pilots(±n)
spawnRaid(house, fighters, cruisers, destroyers, capitals)
flag(name)                   clearFlag(name)         card(id)          # card() queues a follow-up card
rivalScene(id)               winWorld(world)         loseWorld(world)  exile()
breakWorld(world)            chainWorld(world)
```

## Card format (every event card, everywhere)

```
### <id>: <Title>
- Trigger: <worlds held, broken count, standing, flag, or another card>
- Read-aloud: <at most 45 words, present tense, second person, no exclamation marks>
- Choices:
  1. <label>: <effects>
  2. <label>: <effects>
  (2–3 choices; one of them may be "Ignore it", and ignoring always has a cost)
```

## Template for each house file (use these headings, in this order)

**A. The house at the endgame (about 15 lines)**
What this house is like by the time the player meets it late: its fleet, its fear, what it wants from the war. How
it behaves at the Reckoning (3 worlds), in the Last Alliance (5) and as the player's ally when the betrayal comes.

**B. The caste (about 40 lines)**
- Where the edit came from: when, why and who decided it.
- What the edit does to the body.
- A day of work.
- What the caste calls itself, as opposed to the polite word.
- A saying of their own (original, one line).
- What they want.
- Two named caste leaders, each with **a want and a lie**.

**C. The breaking point (about 30 lines)**
The LORE.md crisis hook, built out into a chain of 3 cards: the spark, the choice, the consequence. Use the card
format. It must play two ways: you hold this world (you're the one in the chair), or you're attacking it (you can
light the fuse).

**D. Held and broken (about 20 lines)**
Concrete gameplay for each state: income, unrest, garrison needs, what broken gives (troops, pilots, a unique ship,
a windfall), and what it costs with the other houses. Any unique unit or ship gets one line of look.

**E. The rival school and the rival (about 35 lines)**
Skip this if your house is Mercury: Mercury has no blood enemy, so its rival comes from whoever puts a contract on you.
Write the house's own officer school instead.
- The school: its name, where it is, how it trains.
- The rival: 4 rolled names, the look, the flagship.
- What the rival wants and the lie they tell themselves.
- **Scene lines for each appearance:** World 3 raid, World 5 leading the alliance, World 6 the last stand. At most
  3 lines each.
- The kill, capture and turn outcomes, each with one line and its effects. Turn requires this house's world to be
  broken.

**F. The Katabasis at this capital (about 35 lines)**
The four stages for this capital in detail:
1. The fleet: what defends it, a composition in this house's ships (names from LORE.md).
2. The armour: what the god-armour here looks like and what has to be broken. Read GOD-ARMOUR.md in the
   integration-3 worktree if it exists.
3. The drop: the twist from ENDGAME.md, built out.
4. The palace: what holding it means here.

Also: the way to fail, and one choice the player makes in the middle of it.

**G. The event deck (8 cards)**
Eight cards for this house, using the card format. Spread them across worlds held 1–7, and across held, broken,
ally and enemy, so some fire when you are this house and some when you fight it.

**H. Endings (about 12 lines)**
This house's paragraph for each of the three endings: the Sovereign, the Uneasy Crown, the Breaker. At most 4
sentences each.

**I. The record**
One TypeScript object literal: `{ caste, edited, work, breakingPoint, held, broken, rivalSchool, rivalNames,
lastCapitalTwist, epilogue: { sovereign, uneasy, breaker }, numbers: { … } }`. Every FIRST PASS number in this file
goes in it.

**Length.** About 220–260 lines per house file.

## Voice

Plain and concrete. Short sentences. Name the thing; never say a thing is important or rich or vibrant. Read-aloud
lines sound like a film, not like a textbook. No rhetorical triads, no "not X, but Y" flourishes. Write in British
spelling, to match LORE.md ("armour", "colour").
