# Jupiter: the Diadochoi at the endgame

> DRAFT, 2026-10-20. One of eight files under `ascent-flight\endgame\CONTRACT.md`. Sources: LORE.md (integration-3),
> FEUDS.md, ENDGAME.md, GOD-ARMOUR.md. Ship names from LORE.md, DESTROYER.md (*Hemiolia*), INFANTRY-CARRIER.md
> (*Hippagogos*, Pezhetairoi) and DRILL-BOARDER.md (*Embolon*, the Silver Shields). Sites from CONQUEST.md. Dates
> follow Caleb's ruling of 2026-10-20: the Founding was about the year 3000, and the game is set in 6000.
> **Numbers: FIRST PASS, for Palamedes review.** Every one is listed again in section I.

## A. The house at the endgame

By the late game Jupiter has two kings, two flagships and one enemy it agrees on. The House of Callisto and the House
of Ganymede each field a full line: a *Tessarakonteres*, a *Hemiolia*, two *Sarissa* and four *Hetairos*, and the
Companions who fly the fighters are the nobility itself. Its fear is the oldest one in its lore: to be forgotten. A king
who loses Callisto loses the skyline of statues, and his name comes off the walls.

What it wants from the war is the belt from Mars, Titan from Saturn, and a crown that the other houses call the real
one. Venus calls its own crown the real one, which is why the two quarrel.

**At the Reckoning (3 worlds)** the two crowns stop fighting each other and start bidding for you. Each king offers a
marriage or a title, and each warns you about the other.

**In the Last Alliance (5)** Jupiter brings two fleets under two banners and will not take orders from Mars. The
blood feud between them holds inside the alliance. Hit Jupiter's escorts with Mars in range and the kings blame Mars;
it is the easiest seam in the coalition to split.

**As your ally at the betrayal** Jupiter does it with ceremony. A king opens your gates and calls it a wedding
gift to the alliance. A loyal Jupiter names its price instead, and the price is always Mars, burned.

## B. The caste: the Laoi

**Where the edit came from.** The founding governor died with no heir and the four generals split the moons. A
generation later, about the year 3400, the four met at the Io Prison-fort and agreed one thing together: Io's sulphur
pits would never stop. Io sits deep in Jupiter's radiation, and the convicts sent there died inside two years. The four
crowns ordered the convicts' children edited to live in it. It is the only law all four ever signed, and the Laoi say
so often.

**What the edit does.** The Diadochoi already carry radiation-repair genes. The Laoi carry far more of them, and the
editors traded everything else for it.
- Grey, thick skin that scars instead of burning.
- Short and dense, built for tunnels, where the Diadochoi are the tallest people in the system.
- Small dark eyes made for lamp-light. In the dim ice palaces a Laos can barely see a face.
- The repair holds for a working life and then fails all at once. Few Laoi see sixty.

**A day of work.** The shift starts when the lift drops from the Prison-fort into the Sulphur Pits. Each worker wears
a dose badge on the collar, and the shift ends when the badge turns from white to grey, not when a clock says so. A gang
of twelve cuts sulphur from the walls of an old lava tube and loads it on carts for the lift. The guards stay up top in
shielded towers. Nobody on Io sees Jupiter's light; they see the glow from the vents.

**Their word, and the polite one.** *Laoi* means "the folk": Homer's word for the people who follow a king, which is
what the crowns call them. They call themselves *Homeroi*, the hostages. Every gang gives one child to the ice palaces
as a servant, nurse or cup-bearer, and the crowns call it an honour. The child is the guarantee the gang keeps digging.

**Their saying.** "Both crowns weigh what we dug."

**What they want.** Their children back from the domes, and a lift that goes up and does not come down again. They
have never asked for a crown. That is why the false heir is dangerous: he offers one.

**Two leaders.**
- **Moiro**, shift-mother of the deep gangs at the Sulphur Pits, with forty years of badges in a box under her bunk.
  *Want:* her grandson out of the Callisto palace before he is old enough to be a page's servant for life.
  *Lie:* she tells the gangs she has never spoken to the Prison-fort. She informs every month, for the water ration.
- **Lykon**, born in the pits, sent to the Prison-fort for striking a Companion who struck his sister. He is the
  escaped prisoner of section C.
  *Want:* a crown on Io that answers to nobody on Callisto.
  *Lie:* that he descends from a son the Founder hid on Io. The copper seal he carries was cut in the pits by a man he
  later let die.

## C. The breaking point: the false heir

LORE.md: "A prisoner escapes from Io claiming to be the founding governor's lost heir." Effects land on whoever holds
Jupiter, so the same numbers hurt you when you hold it and help you when you attack it.

### JUP-C1a: The Empty Cell
- Trigger: you hold Jupiter in chains, worlds held 4+, and garrison(jupiter) is under the need in D.
- Read-aloud: The Io Prison-fort reports one cell empty and a guard dead in the lift. On the cell wall someone has cut
  four crowns, and a fifth above them. In the pits below, the gangs have stopped work to look.
- Choices:
  1. Lock down Io: garrison(jupiter, -1), troops(-10), card(JUP-C2)
  2. Pay the gangs to dig: credits(-80), unrest(jupiter, +5), flag(jupHeirLoose), card(JUP-C2)
  3. Ignore it: unrest(jupiter, +15), flag(jupHeirLoose), card(JUP-C2)

### JUP-C1b: The Lamp at the Lift Head
- Trigger: you are at war with Jupiter and your ships destroy the Io Prison-fort's guns.
- Read-aloud: The guns on the Prison-fort go quiet. Through the sulphur haze you see a column of grey people at the
  lift head. One of them holds a lamp up at your ship and waits.
- Choices:
  1. Land and open the lift: troops(-5), standing(jupiter, -15), flag(jupHeirLoose), card(JUP-C2)
  2. Drop supplies and leave: credits(-40), unrest(jupiter, +10), flag(jupHeirLoose), card(JUP-C2)
  3. Ignore it: unrest(jupiter, -10)

### JUP-C2: The Fifth Crown
- Trigger: flag(jupHeirLoose).
- Read-aloud: He is short and grey, burnt down one side of his face. He holds up a copper seal with four crowns and a
  fifth. He says the Founder hid a son on Io, and that he is that son's line.
- Choices:
  1. Give him to the Companions: standing(jupiter, +15), unrest(jupiter, +10), clearFlag(jupHeirLoose)
  2. Back his claim: flag(jupThirdCrown), unrest(jupiter, +25), garrison(jupiter, -2), card(JUP-C3)
  3. Ignore it: flag(jupThirdCrown), unrest(jupiter, +15), card(JUP-C3)

`card(JUP-C3)` deals C3a if you hold Jupiter and C3b if you don't.

### JUP-C3a: Io Stops
- Trigger: JUP-C2, and you hold Jupiter.
- Read-aloud: The lifts are up and the pits are empty. The Prison-fort flies a grey banner with five crowns. Lykon sends
  one line on the open channel: Io will dig again for the king who sets it free.
- Choices:
  1. Set Io free: breakWorld(jupiter), then the Broken effects in D
  2. Take Io back: chainWorld(jupiter), troops(-20), garrison(jupiter, +2), unrest(jupiter, +20), flag(jupHeirDead)
  3. Ignore it: income(jupiter, -40%), unrest(jupiter, +10), card(JUP-C3a)

### JUP-C3b: The Heir's Terms
- Trigger: JUP-C2, and you do not hold Jupiter.
- Read-aloud: Half of Callisto's garrison has gone to Io to take it back. The domes of Kallistopolis are thinly held
  tonight. Lykon asks one thing of you: when you take Jupiter, Io stays free.
- Choices:
  1. Swear it: garrison(jupiter, -3), flag(jupIoSworn)
  2. Promise nothing: garrison(jupiter, -1), unrest(jupiter, +10)

If `jupIoSworn` is set and you later choose chains on Jupiter, Io rises at once: unrest(jupiter, +30), pilots(-2).

## D. Held and broken

**Held in chains.**
- Income: full. The Io Sulphur Pits and the Europa Ice Quarries both run, and Jupiter's helium-3 feeds your capital
  ships (CONQUEST.md).
- Unrest: +5 on each Stirring roll from World 4. The Laoi strike in silence; the pits slow before anyone sees it.
- Garrison: needs 4. Below that, JUP-C1a fires.
- With the houses: Venus approves, standing(venus, +5). Saturn reads it as a warning about Titan, standing(saturn, -5).

**Broken.**
- Io walks out. The pits stop: income(jupiter, -25%), unrest(jupiter, -20).
- The Laoi send you: troops(+30), pilots(+2) from the ore-lift crews, and the sulphur stockpile sold off,
  credits(+150).
- A unique ship: ships(lithagogos, +1). *Look:* a squat grey ore-lifter, shielded like a lead box, its violet crown
  plates torn off and the hull painted with rows of dose-badge marks, one per shift its crew survived.
  It carries troops and stands radiation that kills other crews. The class id `jupiter-lithagogos` needs a hull.
- With the houses: standing(venus, -10), its court runs on the same chains. standing(saturn, +10), the cousins have
  gone home. standing(mars, +10) where Mars is not a blood enemy.
- **If you are Jupiter** and break any world, the court revolts (JUP-E5) and home income falls by 15% until you take
  your next world. (default, open: ENDGAME.md's price for kings.)

## E. The rival school and the rival

**The Royal Pages.** The school sits in the Basileia of Callisto, under the oldest ice dome. Its pages are the
children of Companions, taken at fourteen. They serve the king at table, guard the king's sleep in turns and fly as
the king's wing in battle. The final test is the Night Watch: a page keeps the king's door alone through one full
orbit of Callisto, with a live sword and no relief. A page who sleeps is sent home and their family's name comes off
the wall. Each page is raised by a Laos nurse from the hostage children, so every page grew up speaking a little of the
pits.

**Who meets the rival.** The Pages' top graduate is the rival of any player whose blood enemy is Jupiter. That is Mars,
which has two blood enemies; Mars's rival comes from the Royal Pages (default, open), since the belt war is the one
already burning.

**The rival.** Rolled each game from: Philotas, Stratonike, Amyntas, Phila. Very tall even for a Diadoch, with huge pale
eyes behind a smoked visor, a page's cropped hair, a purple cloak pinned with a plain silver brooch, and a dose badge
on the collar, given by their nurse. *Flagship:* the *Kleos*, a *Tessarakonteres* with the rival's own name already
cut beside the founders' on its throne-room wall. In the World 3 raid the rival flies a *Sarissa* off it.

**What they want.** To have their name on the skyline beside the four founders' statues.
**The lie they tell themselves.** That their nurse loved the palace and chose to stay.

**Scene lines.**
- *World 3, the raid.*
  "You took it fast. Faster than Mars ever took anything."
  "Keep the banners up. I'll come back for them."
- *World 5, leading the alliance.*
  "Six houses, one target. The kings let me lead because nobody else will stand next to Mars."
  "When you're gone they'll go back to killing each other. Today they follow me."
- *World 6, the last stand.*
  "My nurse was from Io. She'd tell me to run."
  "I won't. Come down and finish it."

**How it ends.**
- *Kill:* the name is never cut. credits(+120), xp(+200), flag(rivalDead).
- *Capture:* a drill boarder takes the *Kleos* whole. xp(+200), standing(jupiter, +10), flag(rivalCaptured).
- *Turn* (Jupiter broken, and `jupDomeBroken` not set): the rival takes the badge off and asks where the nurse is now.
  pilots(+4), ships(capital, +1), rivalScene(jupiter-turn), flag(rivalTurned).

## F. The Katabasis at Kallistopolis

**1. The fleet.** Off Callisto: one *Tessarakonteres* (the king's), one *Hemiolia*, two *Sarissa*, four *Hetairos*.
If `jupWedding` is set, the second crown's *Tessarakonteres* and its *Hemiolia* join it. A *Helepolis* sits on the
Valhalla rim as a gun-tower and fires on anything that comes down.

**2. The armour: the Talons of Zeus.** Four violet talons grip Jupiter itself from a spiked crown at the north pole,
each with a zigzag thunderbolt of light down its length (GOD-ARMOUR.md). The armour is round Jupiter, not Callisto,
so this stage is fought at the planet before the crossing. The hangars on the talons launch the *Hetairos* that
cover Callisto's approach. Break the six shield emitters along the thunderbolt of the talon facing Callisto, and the
two Sarissa Batteries, and the hangars stop launching.

**3. The drop.** Valhalla is a ringed crater. Kallistopolis is five ice domes set along its inner ring, joined by
tunnels, with the palace dome in the middle. Callisto has no air. The domes hold all of it. Your carriers come down
inside the crater under fire from the *Helepolis*, and the rival's Silver Shields hold the airlocks of each dome.
- **The twist.** Any dome can be broken from outside with a ship's guns. The dome vents to vacuum and everyone in it
  dies: the Silver Shields, and the Laos servants who live there.
- **The choice in the middle.** The Dome of the Companions holds the main garrison and the pages' nurses.
  - *Break it:* garrison(jupiter, -3), unrest(jupiter, +20), flag(jupDomeBroken). The rival cannot be turned, and
    standing(venus, -15) for burning a court.
  - *Go through the airlocks:* the hold timer in stage 4 starts at once, with that garrison still in the fight.

**4. The palace.** Under the Two Crowns a king is whoever the army acclaims. Holding the Basileia for 180 seconds makes
the Pezhetairoi of Callisto acclaim you. If Ganymedeia still has its own king, a counterattack comes across from
Ganymede halfway through the hold. If `jupThirdCrown` is set, Io's banner is on the open channel the whole time, and
Lykon asks again for what he was promised.

**The way to fail.** Your own infantry is in a dome you break; or the hold drops under 10 troops before the timer runs
out. The drop fails, your carriers lift off, and the rival's name is cut on the wall that night.

## G. The event deck

### JUP-E1: The Wedding Barge
- Trigger: worlds held 1–2; you are at war with Jupiter, or allied with Mars.
- Read-aloud: The two kings have agreed a marriage. A barge of violet and silver is crossing from Ganymede to Callisto
  with four Hetairos for escort. Mars has sent you a short message: it should not arrive.
- Choices:
  1. Hit the barge: spawnRaid(jupiter, 4, 0, 0, 0), standing(mars, +15), standing(jupiter, -20)
  2. Send a gift: credits(-60), standing(jupiter, +10), standing(mars, -10)
  3. Ignore it: flag(jupWedding), garrison(jupiter, +2)

### JUP-E2: King of All Jupiter
- Trigger: worlds held 2+; you are Earth, or you hold Earth; Jupiter is Friendly or better.
- Read-aloud: The Callisto king's envoy kneels on your deck and holds out a diadem. The king asks one word from you:
  that he is king of all Jupiter. Behind the envoy, a Ganymede ship is listening.
- Choices:
  1. Say it: standing(jupiter, +20), flag(jupCallistoRecognised), unrest(jupiter, +10)
  2. Refuse politely: standing(jupiter, -10)
  3. Ignore it: standing(jupiter, -15), standing(mars, +5)

### JUP-E3: Founders' Day
- Trigger: worlds held 3; you hold Jupiter in chains.
- Read-aloud: The four crowns are carried through the ice palaces. The hostage children walk behind them in clean
  grey. On Io, the gangs are told to keep working through the feast.
- Choices:
  1. Let the gangs have the feast: income(jupiter, -10%), unrest(jupiter, -10)
  2. Send the children home for a day: unrest(jupiter, -15), standing(jupiter, -5), flag(jupHostagesVisit)
  3. Ignore it: unrest(jupiter, +10)

### JUP-E4: Cousins at Titan
- Trigger: worlds held 3–4; you hold Saturn or are allied with it; Jupiter is unbeaten.
- Read-aloud: A Jupiter squadron parks off Titan and announces it has come to protect its cousins. Nobody on Titan asked
  for it. The Ekklesia wants to know what you will do.
- Choices:
  1. Drive them off: spawnRaid(jupiter, 4, 2, 0, 0), standing(saturn, +15), standing(jupiter, -15)
  2. Let them stay: standing(jupiter, +10), standing(saturn, -20), unrest(saturn, +10)
  3. Ignore it: unrest(saturn, +15), standing(saturn, -10)

### JUP-E5: The Companions' Petition
- Trigger: you are Jupiter, and you break any world. (default, open)
- Read-aloud: Twelve Companions stand in your throne room with their helmets under their arms. They say a king who
  frees one people will free the next. They want your word that Io stays as it is.
- Choices:
  1. Give it: flag(jupIoChained), standing(venus, +5), pilots(+1)
  2. Refuse: pilots(-3), income(jupiter, -15%), unrest(jupiter, +10)
  3. Ignore it: pilots(-2), unrest(jupiter, +15)

### JUP-E6: Two Purples
- Trigger: worlds held 4; Venus and Jupiter both unbeaten; you are Friendly with both.
- Read-aloud: A Nephelan envoy and a Diadoch envoy arrive at your station an hour apart. Each wears purple. Each asks you
  to receive them first, and each says the other's purple is dyed.
- Choices:
  1. Receive Venus first: standing(venus, +15), standing(jupiter, -15)
  2. Receive Jupiter first: standing(jupiter, +15), standing(venus, -15)
  3. Ignore it: standing(venus, -10), standing(jupiter, -10)

### JUP-E7: The King's Price
- Trigger: worlds held 5; Jupiter is your highest-standing ally and below the maximum.
- Read-aloud: The king's voice is calm on the channel. The alliance has offered Jupiter your home station's gates. The
  king will not take them, for a price: Urbs Arsia, burned to the rock.
- Choices:
  1. Promise Mars: flag(jupMarsPromised), standing(mars, -20), standing(jupiter, +15)
  2. Offer a world instead: loseWorld(<your choice>), standing(jupiter, +10)
  3. Refuse: flag(jupBetrays), standing(jupiter, -30)

### JUP-E8: The Hostages Come Home
- Trigger: worlds held 6–7; Jupiter is broken.
- Read-aloud: The lift on Io is coming up full. Every child the gangs gave to the palaces is on it, in palace grey, and
  the gangs are waiting at the top. Lykon asks if you will come down and stand with them.
- Choices:
  1. Go down: unrest(jupiter, -20), pilots(+2), xp(+40)
  2. Send a Companion in your place: unrest(jupiter, -5), standing(jupiter, +5)
  3. Ignore it: unrest(jupiter, +10), flag(jupHeirSnubbed)

## H. Endings

**The Sovereign.** Both crowns kneel to you, and the Io lift goes down every shift as it always has. The Companions
cut your name on the skyline beside the four founders. The hostage children still pour the wine at court. Moiro's box
of badges is full.

**The Uneasy Crown.** You wear Jupiter's crown and Io flies its own grey banner, and the two of them trade sulphur for
water across a few hundred thousand kilometres of radiation. The statues stay up. Nobody in the palaces can find a
cup-bearer who will stay.

**The Breaker.** The domes still hold air, but the Basileia is a hall for anyone who walks in. The lift on Io stopped
for good, and the last gang came up wearing their badges as medals. The statues of the four founders are still on the
skyline, because nobody could agree whose name to cut on them next.

## I. The record

```ts
export const JUPITER_ENDGAME = {
  caste: 'Laoi', // they call themselves Homeroi, the hostages
  edited: 'radiation repair, thick grey skin, short dense build, small lamp-light eyes; about the year 3400',
  work: 'the Io Sulphur Pits under the Prison-fort, in the worst radiation of any moon',
  breakingPoint: 'A prisoner escapes from Io claiming to be the founding governor\'s lost heir.',
  held: 'Both crowns hold, and the pits run.',
  broken: 'The false heir leads Io out: a third crown, which splits Jupiter at the worst moment.',
  rivalSchool: 'the Royal Pages, in the Basileia of Callisto',
  rivalNames: ['Philotas', 'Stratonike', 'Amyntas', 'Phila'],
  lastCapitalTwist: 'Kallistopolis, five ice domes in the Valhalla crater; break a dome and it opens to vacuum.',
  epilogue: {
    sovereign: 'Both crowns kneel, and the Io lift goes down every shift as it always has.',
    uneasy: 'Io flies its own grey banner and trades sulphur for water with the crown.',
    breaker: 'The lift on Io stopped for good, and the last gang came up wearing their badges as medals.',
  },
  numbers: { // numbers: FIRST PASS, for Palamedes review
    held: { garrisonNeed: 4, stirringUnrest: 5, venusStanding: 5, saturnStanding: -5 },
    broken: { income: -25, unrest: -20, troops: 30, pilots: 2, credits: 150, lithagogos: 1,
      venusStanding: -10, saturnStanding: 10, marsStanding: 10 },
    kingsPrice: { homeIncome: -15, untilNextWorld: true },
    ioSwornThenChained: { unrest: 30, pilots: -2 },
    cards: {
      'JUP-C1a': { lockdown: { garrison: -1, troops: -10 }, pay: { credits: -80, unrest: 5 }, ignore: { unrest: 15 } },
      'JUP-C1b': { land: { troops: -5, jupiter: -15 }, supply: { credits: -40, unrest: 10 }, ignore: { unrest: -10 } },
      'JUP-C2': { hand: { jupiter: 15, unrest: 10 }, back: { unrest: 25, garrison: -2 }, ignore: { unrest: 15 } },
      'JUP-C3a': { retake: { troops: -20, garrison: 2, unrest: 20 }, ignore: { income: -40, unrest: 10 } },
      'JUP-C3b': { swear: { garrison: -3 }, nothing: { garrison: -1, unrest: 10 } },
      'JUP-E1': { raid: { fighters: 4, mars: 15, jupiter: -20 }, gift: { credits: -60, jupiter: 10, mars: -10 },
        ignore: { garrison: 2 } },
      'JUP-E2': { say: { jupiter: 20, unrest: 10 }, refuse: { jupiter: -10 }, ignore: { jupiter: -15, mars: 5 } },
      'JUP-E3': { feast: { income: -10, unrest: -10 }, visit: { unrest: -15, jupiter: -5 }, ignore: { unrest: 10 } },
      'JUP-E4': { drive: { fighters: 4, cruisers: 2, saturn: 15, jupiter: -15 },
        stay: { jupiter: 10, saturn: -20, saturnUnrest: 10 }, ignore: { saturnUnrest: 15, saturn: -10 } },
      'JUP-E5': { give: { venus: 5, pilots: 1 }, refuse: { pilots: -3, income: -15, unrest: 10 },
        ignore: { pilots: -2, unrest: 15 } },
      'JUP-E6': { first: { winner: 15, loser: -15 }, ignore: { venus: -10, jupiter: -10 } },
      'JUP-E7': { promise: { mars: -20, jupiter: 15 }, offer: { jupiter: 10 }, refuse: { jupiter: -30 } },
      'JUP-E8': { go: { unrest: -20, pilots: 2, xp: 40 }, send: { unrest: -5, jupiter: 5 }, ignore: { unrest: 10 } },
    },
    rival: { kill: { credits: 120, xp: 200 }, capture: { xp: 200, jupiter: 10 }, turn: { pilots: 4, capitals: 1 } },
    katabasis: {
      fleet: { capitals: 1, destroyers: 1, cruisers: 2, fighters: 4, helepolis: 1 },
      weddingAdds: { capitals: 1, destroyers: 1 },
      talonShieldEmitters: 6, sarissaBatteries: 2, domes: 5,
      breakCompanionsDome: { garrison: -3, unrest: 20, venus: -15 },
      holdSeconds: 180, failBelowTroops: 10,
    },
  },
};
```

## New effects needed

- `card(JUP-C3)` resolving to C3a or C3b by who holds Jupiter. If the director can't branch a card id, split JUP-C2
  into a held copy and an attacking copy instead.
- `loseWorld(<your choice>)` in JUP-E7 needs the player to pick the world; `loseWorld` today takes a fixed world.
