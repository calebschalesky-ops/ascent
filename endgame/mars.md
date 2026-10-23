# Mars (the Quirites): the endgame

> Kalliope, 2026-10-20. Written to `endgame/CONTRACT.md`. Sources: `LORE.md` (integration-3 worktree), `FEUDS.md`,
> `ENDGAME.md`, `GOD-ARMOUR.md`. Numbers: FIRST PASS, for Palamedes review. Every one is repeated in the record
> (section I). In effects, a world is named by its house key, so `mars` means Urbs Arsia. A `standing()` change against
> a blood-feud pair does nothing, because blood feuds never move (FEUDS.md).

## A. The house at the endgame

By the time you meet Mars late, it has been at war since before you undocked. The belt war with Jupiter never
stopped, and the Secession grudge with Earth never cooled. Its fleet is plain and there is a lot of it: grey Rostrata
wedges, Corvus boarding cruisers, Velite squadrons of eight. Every yard builds to one plan, so a lost ship comes back
as the same ship. Mars wants three things from the war: the belt, ice for the Greening, and no king. That includes you.

Its fear is the old one. One person gathering too much power is the oldest Martian nightmare, and by World 3 that
person is you.

- **At the Reckoning (3 worlds).** If Mars isn't your blood enemy, it drifts toward Hostile faster than the other
  Wary houses, because the Senate reads three capitals as a crown. If you are Earth or Jupiter nothing changes; you
  were already the enemy. Its raids on you add one Corvus.
- **In the Last Alliance (5 worlds).** Mars brings the most troops and the Testudo landers, and it wants to be the
  house that lands on your home world. It won't fly in formation with Jupiter. When Jupiter takes losses first, Mars
  holds back to watch, and that gap is where the alliance breaks (card `mars-ev-7`).
- **As your ally at the betrayal.** Mars betrays by decree, not by one traitor: the Senate votes, and the decree is
  read on an open channel before the gates open. A loyal Mars always names the same price, its blood enemy wiped out.
  It asks for Jupiter first, and for Earth if Jupiter is gone. It never asks for one of your worlds, because Mars has
  no use for a city it didn't take itself.

## B. The caste: the Proletarii

**Where the edit came from.** Before the Secession, while Mars was arming for a war with Earth, the colony needed ice
faster than its citizens would dig it. The first censors ruled on it. They kept the citizen edit (bones and heart close
to human, eyes for low light) and wrote a second, harsher one for the families who worked the ice under Arsia Mons and
owned nothing else. The Censors' Edict is still cut into the wall of the Curia. On Mars you vote in your legion, and the
Edict keeps the headcount out of the legions. That is the whole trick: they are counted, and they can't vote.

**What the edit does to the body.** Their eyes go past the citizen edit. A Proletarius reads an ice face by the spill
of one lamp and goes half-blind under a dome at noon. Their blood runs cold: the body holds a lower core heat, the
hands keep working at the face, and they barely shiver. It costs them the other way. The heated halls of the upper city
make them sweat and sicken inside a day, so the edit keeps them below as surely as the law does.

**A day of work.** The shift is counted at the shaft head going down. They ride the cage through the basalt to the old
glacier buried in Arsia's flank, cut it with heated drills and stack the blocks on sleds for the melt. The melt fills
the cisterns of Urbs Arsia. At the end of the sol the shift is counted again coming up. The census-taker writes two
numbers and goes home. Nobody asks the shift anything.

**What they call themselves.** The Senate's word is *Proletarii*, those who serve the state with their children; the
census writes them as *capite censi*, counted by the head. The upper city calls them *cuniculi*, rabbits, for the size
of their families. The miners kept the word for its other meaning: in Latin a *cuniculus* is also a mine tunnel. When a
miner says it, they mean the tunnel.

**Their saying.** "Counted twice a sol, asked never."

**What they want.** The vote, which on Mars means a place in a legion. After that, their names on the Greening rolls,
the lists of who did the thousand-year work. The rolls name engineers and consuls. The ice that became the water came
up in miners' hands, and nobody wrote that down.

**Two leaders.**
- **Tertia Collina**, shift-chief at the deep face. *Wants:* her two sons enrolled in a legion before the next
  election, so her family votes. *Lie:* she tells the census-taker the deep face will never strike. She has already
  given General Asper the names of every shift that will march.
- **Mamercus Opsius**, who speaks for the shafts in the upper city. *Wants:* to be the first tribune of the people
  elected from the headcount. *Lie:* he tells the miners he has never taken Senate money. The Senate pays him a stipend
  every Mars year to keep the shafts working through the war.

## C. The breaking point: the general marches

LORE.md's first Mars hook: "A popular general wins the belt war and marches on the Senate." The general is **Gnaeus
Laberius Asper**. He couldn't fill his legions for the belt war, so he enrolled the headcount, which the Edict forbids.
He won. Now his legions want the vote that enrolment was supposed to carry, and he brings them home to collect it.
You play it from the chair (`mars-bp-1`) or light it from outside (`mars-bp-1x`). Both lead to `mars-bp-2`.

### mars-bp-1: The Legions Turn
- Trigger: World 4 (the Stirring); you hold Mars in chains and its garrison is below the need.
- Read-aloud: From Castra Phobos you watch Asper's legions come up the Via Marineris with Jupiter's standards on their
  carts. A year ago every one of them was a miner. At the last fort they stop, and turn toward Urbs Arsia.
- Choices:
  1. Shut the gates of the tubes: garrison(mars, +2), unrest(mars, +10), card(mars-bp-2)
  2. Send a rider to meet Asper on the road: credits(-60), unrest(mars, -5), card(mars-bp-2)

### mars-bp-1x: The Pay Chest
- Trigger: you are attacking Mars (any house); World 3 or later; you have won a fight in the belt against Mars.
- Read-aloud: Asper's paymaster hails you from a wrecked Corvus. The Senate has stopped the legions' pay, because
  headcount soldiers were never meant to be paid as citizens. The chest is empty. The paymaster asks what you would
  put in it.
- Choices:
  1. Fill the chest: credits(-150), flag(mars_asper_marching), garrison(mars, -3), unrest(mars, +20)
  2. Send the Senate the paymaster's name: flag(mars_asper_purged), garrison(mars, +1), unrest(mars, +10)
  3. Ignore it: unrest(mars, +5), and Asper wins the belt war without you: spawnRaid(mars, 4, 1, 0, 0)

If `mars_asper_marching` is set and Mars is an AI house, the director plays `mars-bp-2` for the Senate: it names a
dictator and holds the gates, losing garrison and gaining unrest as in choice 2. You see the result on the world panel.

### mars-bp-2: Asper at the Gate
- Trigger: `mars-bp-1`, or `mars_asper_marching` when you take Urbs Arsia.
- Read-aloud: Asper stands under the main skylight with the legions packed in the tube behind. He doesn't ask for the
  city. He asks for one line struck off the Curia wall, and the Senate is looking at you.
- Choices:
  1. Strike the Edict and enrol them: breakWorld(mars), troops(+6), flag(mars_asper_enfranchised), card(mars-bp-3)
  2. Name a dictator and hold the gates: chainWorld(mars), garrison(mars, +3), troops(-4), unrest(mars, +25),
     flag(mars_dictator), card(mars-bp-3)
  3. Pay the arrears and send them back down the shafts: credits(-250), unrest(mars, +10), flag(mars_bought_off),
     card(mars-bp-3)

### mars-bp-3: Asper Asks for a Triumph
- Trigger: `mars-bp-2` resolved, one sol later.
- Read-aloud: Whatever happened at the gate, Asper is still alive and still the most popular soldier on Mars. Now the
  general asks for a Triumph through Urbs Arsia. The tribunes ask you quietly what comes after a Triumph.
- Choices:
  1. Grant it, with a slave at his ear: unrest(mars, -10), flag(mars_asper_citizen)
  2. Refuse, and exile him to the belt: unrest(mars, +15), flag(mars_asper_exiled), spawnRaid(mars, 4, 2, 0, 0)
  3. Make him your legate: troops(+4), flag(mars_asper_legate), standing(saturn, -10), standing(venus, -10)

## D. Held and broken

**Held in chains.**
- Income: the best ice income in the inner system, and Mars's share of belt trade. income(mars, +15%).
- Unrest: starts at 20 and rises by 5 each time you take another world, because every capital you take is one more
  thing a Martian can call a crown.
- Garrison: the largest need of any capital, 4, because the legions live in the same tubes as the Senate.
- The belt war is now yours. Jupiter raids Urbs Arsia on its own clock, whether or not it is your blood enemy.
- If you are Mars, Mars's own pitch bites (default, open): every other world you keep in chains adds unrest(mars, +5)
  at home, because the shafts ask why citizenship stops at them.

**Broken.**
- Asper's legions come over: troops(+8) and ships(mars-testudo, +2).
- **The Headcount Cohort** (flag `mars_drill_crews`): miners who cut ice for a living. Every drill boarder you own
  drills 25% faster for the rest of the game, at any capital. *Look:* a Testudo with an ice drill bolted under its nose,
  its grey plates scratched white with tally marks, one per shift the crew was counted.
- Income drops for one cycle while the shafts hold their first election: income(mars, -20%), then income(mars, +10%).
- Unrest starts at 5. Garrison need falls to 2.
- Cost with the houses: Jupiter's kings and Venus's court fear a freed headcount, standing -15 each. Saturn approves,
  standing +10. Earth's line that it holds the only free people gets weaker, and an Earth AI loses 5% income at home.
- Breaking Mars is cheap for a Mars or Saturn player (ENDGAME.md). For a Jupiter or Venus player it carries their
  house's court-revolt price (default, open).

## E. The rival school and the rival

**The Campus Martius.** On the lava plain below Arsia's flank, outside the tubes: the one place Quirites train under
the open sky, in suits, in the cold. Cadets come from citizen families and train as one legion for five Mars years.
They learn the boarding trade first. A cadet crosses a Corvus bridge under fire before they ever fly a Velite. The top
prize is the *corona navalis*, given to the first cadet aboard an enemy hull in the final trial. The Campus has one
quiet back door: a senator without an heir may adopt a child and send them in under the family name.

**The rival.** Mars's rival meets you if Mars is your blood enemy, so if you play Earth or Jupiter, and a Mercury
player meets them if Mars is first to put a contract out on you. The rival was born in the shafts under Arsia Mons and
adopted out of them by a senator, which is why the turn is possible at all. Name rolled each game (default, open):

| Roll | Name (masculine / feminine form) | Where it comes from |
|---|---|---|
| 1 | Gaius Vettius Arsianus / Vettia Arsiana | adoptive family Vettius; *-ianus* marks the adoption |
| 2 | Lucius Fannius Glacianus / Fannia Glaciana | "of the ice"; the shaft family's name, kept |
| 3 | Quintus Herennius Saxa / Herennia Saxa | "Rock", the Campus nickname, kept as a name |
| 4 | Aulus Pupius Lucifugus / Pupia Lucifuga | "Shuns the light", for the headcount eyes |

The game calls the rival **the Legate**. *Look:* tall and long-limbed like any Quirite, but with the headcount's wide
dark pupils, a smoked visor down under every dome, and white ice-burn scars across both hands. Grey tunic, red cloak,
one red stripe. *Flagship:* the Rostrata **Fides**, "Good Faith", named for the promise the Republic made the headcount.

**Want.** To be the first consul born in the shafts, which would prove the Republic keeps its word.
**The lie.** "I was chosen because I was the best, so the system works." The Legate was chosen because a senator
needed an heir, and the shafts behind them are still counted.

**Scene lines.**
- *World 3, the raid.*
  "Your newest world counted its people this morning. I counted your guns."
  "Nobody here will remember your name. They'll remember who left the gate open."
  "Next time I bring the whole legion."
- *World 5, leading the alliance.*
  "The Senate gave me the alliance fleet. Jupiter flies on my left, and I watch them more than I watch you."
  "Every house in the system signed one paper. It has your name on it."
  "Strike your colours and your crews walk home. I keep my word. Mars keeps its word."
- *World 6, the last stand.*
  "I was born under this mountain. I know every tube you're drilling into."
  "You want the Curia? Come down here and take it."
  "The Republic promised us the vote after the war. This is the war."

**Outcomes.**
- *Kill:* the Legate dies in the tube junction, and the shafts set up a bust next to their own dead. xp(+200),
  credits(+120), garrison(mars, -2), unrest(mars, +10), flag(rival_dead)
- *Capture:* a drill boarder cuts into the *Fides* and takes the Legate on the bridge. ships(mars-rostrata, +1),
  flag(rival_captured), rivalScene(mars-captured)
- *Turn (Mars broken only):* the Legate reads the struck Edict and walks out of the Curia with you.
  troops(+6), pilots(+4), unrest(mars, -20), flag(rival_turned), rivalScene(mars-turned)

## F. The Katabasis at Urbs Arsia

**1. The fleet.** The consul's Rostrata leads, with 2 destroyers (LORE.md has no Martian destroyer class name; a
build thread should take it from `races.ts` if one exists), 4 Corvus and 16 Velite in two squadrons of eight. The
guns of Castra Phobos and Castra Deimos cover the inner orbit. The Corvus come for your capital ship with their
boarding bridges out, so keep fighters on them. The *Fides* is not here. It hangs low over Arsia Mons for the drop.

**2. The armour: the Ancile.** A figure-eight shield over the Earthward face, built of grey dagger-wedge plates laid in
chevrons and cut by long trenches, with the spear band (the *hasta*) running pole to pole behind it. Twelve
shield-emitter bosses sit on the two lobes. As in the story of Numa's shield, eleven are copies made so the real one
couldn't be stolen. Break a copy and only its section drops, for 20 s. Break the true boss and the whole shield drops.
*The tell:* the copies draw their charge from the true boss, so the true one lights a beat before the others each
time the shield pulses. Coming in from the far side misses the shield but runs into the spear band's batteries.

**3. The drop: through the rock.** Urbs Arsia lives in lava tubes on Arsia's flank, lit through skylights where the
tube roofs fell in. Each skylight is the obvious way in and carries 6 guns. So you don't use them. Testudo landers set
drill boarders down on the flank, and they cut down through the basalt into the tubes: 60 s through basalt, 25 s
through buried glacier ice. The Legate moves cohorts through the tubes to meet each breach as it opens. Any drill
still cutting when a cohort arrives is lost with its troops.

**4. The palace: the Curia.** It sits in the largest tube, under the main skylight. Hold it for 180 s against the
counterattack. The eagle standards of the home legions are kept in the Curia, and on Mars a legion that loses its
standard is disbanded. Every 30 s you hold the Curia, one counterattack wave fails to arrive. Holding Urbs Arsia means
the belt claim passes to you, and Jupiter's war with Mars becomes your war.

**The way to fail.** If the drop runs past 600 s, the Senate names a dictator, and the dictator's legions come in
through the skylights behind you. If they retake the Curia, or every drill boarder is lost, you are thrown back to
orbit. The Ancile's true boss restarts after 300 s.

**The choice in the middle.**

### mars-kat-1: The Old Shafts
- Trigger: stage 3 begins at Urbs Arsia.
- Read-aloud: A miner's lamp blinks at you from a vent on Arsia's flank. It's Tertia Collina. She knows where the old
  ice shafts run under the basalt, straight into the tubes. She'll show your drills, and she wants an answer first.
- Choices:
  1. Promise her the Edict struck: flag(mars_shafts_promise); every drill cuts at the ice time. If you later choose
     chains on Mars, unrest(mars, +40) and her shifts join the counterattack.
  2. Drill the basalt yourself: troops(-4)
  3. Go in through a skylight: troops(-8), xp(+100); the drop takes half the time

## G. The event deck

### mars-ev-1: Wreck Field
- Trigger: worlds held 1–2; you are not Mars.
- Read-aloud: A Jupiter convoy burns in the belt. Martian Corvus cruisers are still bridged to two of the hulls,
  stripping them. They see you. Nobody fires yet.
- Choices:
  1. Wait, then take what's left: credits(+80), standing(jupiter, -5)
  2. Drive the Martians off: spawnRaid(mars, 4, 1, 0, 0), standing(jupiter, +10), xp(+40)
  3. Ignore it: standing(jupiter, -5)

### mars-ev-2: The Senate Asks
- Trigger: worlds held 2; your standing with Mars is Friendly or Allied.
- Read-aloud: A consul's courier docks with a decree. The Senate thanks you for your friendship and asks for ships on
  the belt front within the sol. The decree is signed already. Your answer is the only blank line.
- Choices:
  1. Send four fighters: ships(fighter, -4), standing(mars, +15), standing(jupiter, -20)
  2. Send credits instead: credits(-100), standing(mars, +5)
  3. Ignore it: standing(mars, -15)

### mars-ev-3: Ring Ice
- Trigger: worlds held 2–3; you hold Mars; you are not Saturn.
- Read-aloud: A Martian ice freighter sits dead at Stoa Station with Saturn's seal on the hatch. The Ekklesia voted to
  seize the cargo. The cisterns under Arsia are low, and the Greening engineers want to know what you will do.
- Choices:
  1. Pay Saturn's price: credits(-120), standing(saturn, +10)
  2. Take the freighter back: standing(saturn, -20), income(mars, +10%), spawnRaid(saturn, 4, 1, 0, 0)
  3. Ignore it: income(mars, -10%), unrest(mars, +10)

### mars-ev-4: Census Day
- Trigger: worlds held 3 or more; you hold Mars in chains.
- Read-aloud: The census-taker stands at the shaft head with the roll. The shift stands in front of the cage, and
  nobody steps forward to be counted. Tertia Collina holds her lamp up so you can see every face.
- Choices:
  1. Count them by force: garrison(mars, +1), unrest(mars, +15)
  2. Let them refuse this once: unrest(mars, -5), income(mars, -5%), flag(mars_census_skipped)
  3. Put their names on the Greening rolls: credits(-80), unrest(mars, -15), flag(mars_rolls_named)

### mars-ev-5: The Consul's Treaty
- Trigger: worlds held 4; you are Earth; Mars is not yet taken.
- Read-aloud: A Martian consul meets you off Pharos Station with no escort. The offer is a treaty that calls the
  Secession a mistake. The Senate hasn't seen it. If it ever does, this consul is finished.
- Choices:
  1. Sign it in secret: flag(mars_consul_treaty), garrison(mars, -2), credits(-50)
  2. Leak it to the Senate: unrest(mars, +15), flag(mars_consul_exiled)
  3. Ignore it: the consul proves loyal at home instead, garrison(mars, +1)

### mars-ev-6: A Standard for the Headcount
- Trigger: worlds held 4 or more; you hold Mars broken.
- Read-aloud: Asper's veterans come to you in mining greys, carrying a pole with no eagle on it. On Mars a legion
  without a standard isn't a legion. They want one from your hand, with their own number on it.
- Choices:
  1. Give them an eagle and a number: credits(-100), troops(+6), flag(mars_headcount_legion)
  2. Fold them into your own ranks: troops(+4), unrest(mars, +10)
  3. Ignore it: unrest(mars, +15), troops(-4)

### mars-ev-7: The Legate's Offer
- Trigger: worlds held 5; Mars and Jupiter are both in the Last Alliance.
- Read-aloud: A Martian legate hails you on a closed channel. Jupiter's flagship flies on the alliance's left wing.
  Burn it, and the Martian line holds back for one battle. Nothing is written down.
- Choices:
  1. Agree, and go for the flagship: flag(mars_holds_back), standing(jupiter, -20)
  2. Agree, then hit the Martians while they wait: flag(mars_legate_betrayed), xp(+100), standing(mars, -30)
  3. Ignore it: flag(alliance_holds)

### mars-ev-8: The Triumph
- Trigger: worlds held 7, or 6 with Mars held.
- Read-aloud: Urbs Arsia gives you a Triumph. The road through the tubes is lined with busts of the dead. A slave rides
  behind you in the car and leans in with the old line: remember you are mortal. The crowd waits to see your face.
- Choices:
  1. Let the slave speak: unrest(mars, -15)
  2. Have the slave put out of the car: unrest(mars, +20), flag(mars_king_feared)
  3. Put a miner in the car instead (Mars broken only): unrest(mars, -25), flag(mars_miner_in_car)

## H. Endings

**The Sovereign.** Urbs Arsia keeps its Senate, and the Senate keeps counting heads. The miners still ride the cage up
twice a sol to be counted, and now they are counted for you. Down at the deep face, a shift-chief is writing names.
Mars always feared a king, and it got one.

**The Uneasy Crown.** Half the shafts under Arsia vote and half don't, and every miner knows which half they're in.
Asper's veterans stand on the Curia steps on election day. The Greening rolls carry new names, cut in a rougher hand.

**The Breaker.** There is no Senate in the tubes and no census at the shaft head. The miners go down when they choose
to and come up when they're done. The Greening goes on, slower, with more hands deciding where the water goes.

## I. The record

```ts
{
  caste: 'Proletarii (the headcount); they call themselves cuniculi, meaning the tunnels',
  edited: 'low-light eyes past the citizen edit; cold blood that works the ice and sickens in heated halls',
  work: 'cut the buried glacier under Arsia Mons for the cisterns of Urbs Arsia; counted, never allowed in a legion, so never allowed to vote',
  breakingPoint: 'General Gnaeus Laberius Asper wins the belt war with legions raised from the miners and marches on the Senate (mars-bp-1, mars-bp-1x, mars-bp-2, mars-bp-3)',
  held: 'The Senate stands, and the miners pay for it',
  broken: "Asper's legions come over. Mars's own pitch, citizenship for all, comes back to bite it",
  rivalSchool: 'Campus Martius',
  rivalNames: [
    ['Gaius Vettius Arsianus', 'Vettia Arsiana'],
    ['Lucius Fannius Glacianus', 'Fannia Glaciana'],
    ['Quintus Herennius Saxa', 'Herennia Saxa'],
    ['Aulus Pupius Lucifugus', 'Pupia Lucifuga'],
  ],
  lastCapitalTwist: 'Lava tubes: the skylights are guarded, so drill boarders cut through the rock of Arsia Mons',
  epilogue: {
    sovereign: 'The miners ride the cage up twice a sol to be counted, and now they are counted for you.',
    uneasy: "Half the shafts under Arsia vote and half don't, and every miner knows which half they're in.",
    breaker: 'No census at the shaft head; the miners go down when they choose to.',
  },
  // numbers: FIRST PASS, for Palamedes review
  numbers: {
    held: { incomePct: 15, unrestStart: 20, unrestPerWorldTaken: 5, garrison: 4, marsPlayerUnrestPerChainedWorld: 5 },
    broken: {
      troops: 8, testudo: 2, drillSpeedPct: 25, incomeFirstCyclePct: -20, incomeAfterPct: 10,
      unrestStart: 5, garrison: 2, standing: { jupiter: -15, venus: -15, saturn: 10 }, earthAiHomeIncomePct: -5,
    },
    breakingPoint: {
      bp1: { shutGarrison: 2, shutUnrest: 10, riderCredits: -60, riderUnrest: -5 },
      bp1x: { payCredits: -150, payGarrison: -3, payUnrest: 20, purgeGarrison: 1, purgeUnrest: 10, ignoreUnrest: 5,
              ignoreRaid: [4, 1, 0, 0] },
      bp2: { enrolTroops: 6, dictatorGarrison: 3, dictatorTroops: -4, dictatorUnrest: 25, arrearsCredits: -250,
             arrearsUnrest: 10 },
      bp3: { triumphUnrest: -10, exileUnrest: 15, exileRaid: [4, 2, 0, 0], legateTroops: 4, legateStanding: -10 },
    },
    rival: {
      kill: { xp: 200, credits: 120, garrison: -2, unrest: 10 },
      capture: { rostrata: 1 },
      turn: { troops: 6, pilots: 4, unrest: -20 },
    },
    katabasis: {
      fleet: { rostrata: 1, destroyers: 2, corvus: 4, velite: 16 },
      ancile: { bosses: 12, trueBosses: 1, copySectionDownS: 20, trueBossRestartS: 300 },
      drop: { skylightGuns: 6, drillBasaltS: 60, drillIceS: 25 },
      palace: { holdS: 180, waveSkippedEveryS: 30 },
      dictatorTimerS: 600,
      kat1: { brokenPromiseUnrest: 40, basaltTroops: -4, skylightTroops: -8, skylightXp: 100, skylightTimeFactor: 0.5 },
    },
    deck: {
      ev1: { credits: 80, standingJupiterTake: -5, raid: [4, 1, 0, 0], standingJupiterDrive: 10, xp: 40,
             standingJupiterIgnore: -5 },
      ev2: { fighters: -4, standingMarsSend: 15, standingJupiterSend: -20, credits: -100, standingMarsPay: 5,
             standingMarsIgnore: -15 },
      ev3: { credits: -120, standingSaturnPay: 10, standingSaturnTake: -20, incomeTakePct: 10, raid: [4, 1, 0, 0],
             incomeIgnorePct: -10, unrestIgnore: 10 },
      ev4: { forceGarrison: 1, forceUnrest: 15, refuseUnrest: -5, refuseIncomePct: -5, rollsCredits: -80,
             rollsUnrest: -15 },
      ev5: { signGarrison: -2, signCredits: -50, leakUnrest: 15, ignoreGarrison: 1 },
      ev6: { eagleCredits: -100, eagleTroops: 6, foldTroops: 4, foldUnrest: 10, ignoreUnrest: 15, ignoreTroops: -4 },
      ev7: { standingJupiter: -20, betrayXp: 100, standingMars: -30 },
      ev8: { speakUnrest: -15, removeUnrest: 20, minerUnrest: -25 },
    },
  },
}
```

### New effects needed
None. Troops are written in cohorts (an assumption; no troop scale is set in the sources). The drill-speed bonus
and the Ancile's true boss are flags read by the Katabasis, not new effects.
