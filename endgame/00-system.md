# Endgame 00: the system (DRAFT, 2026-10-20)

The part of the endgame every house shares. It sits on `ENDGAME.md` and `FEUDS.md` and follows `endgame/CONTRACT.md`.
Where this file and a source disagree, the source wins.

**Caleb's ruling, 2026-10-20, over every source:** the game opens in the **year 6000**. The Founding was around the
year **3000**: three thousand years of history, not the three centuries LORE.md's charter line implies. The Editing,
the Sundering and every feud are old. Nobody alive remembers a time before the castes.

Every number here is **FIRST PASS, for Palamedes review**. They are all gathered in section 13, the record. Prose
quotes a number only where a reader needs it, with its record key in backticks. House cards are referred to by house
and beat ("Venus, beat 4"), never by id, because the house files are being written alongside this one.

---

## 1. The two numbers

**Worlds held** (0–7) counts capitals you hold, your home included. A vassal (FEUDS.md 1) counts as held. This is the
clock. Code note for Talos: `director.ts` counts `turned`, which is worlds held minus your home, so `turned = held - 1`.

**Broken count** (0–7) counts held worlds whose caste you freed. A world you lose stops counting. A world you take
back keeps the state it had when you lost it, unless the rival changed it (section 7).

### 1.1 How each system reads them

| System | Reads worlds held | Reads broken count |
|---|---|---|
| Director (section 2) | Which beat is due; the calm-raid comes from the coalition at 3+ | Which shared cards are in the deck |
| Standings | At 3, every Wary house drifts toward Hostile | Truce price ×1 at 0, ×2 at 1–2, no truce at 3+ |
| Unrest | Each chained world gains unrest every tick | Broken worlds gain none; chained worlds gain more when a world breaks (SYS-06) |
| Coalition (section 4) | Marches at 5 | A member's own caste can rise and pull it home at 3+ |
| Betrayal (section 5) | Fires at 5 | At 3+ no ally offers a price: it is loyal for nothing, or it betrays |
| The rival | Appears at 3, leads at 5, defends at 6 | Turning needs their home world broken |
| Castes rising | n/a | At 3+, entering an enemy capital's space drops its garrison (`riseOnArrival`) |
| Katabasis (section 6) | Starts at 6, on the one capital left | Stage 4 counterattack is smaller if the target's caste rises |
| Exile (section 7) | Game over at 0 | A broken home is put back in chains by the rival |
| Ending (section 8) | Fires at 7 | Picks the ending: 0–2 Sovereign, 3–4 Uneasy Crown, 5–7 Breaker |

### 1.2 Chains or broken, and its price

The prompt fires on every capital you take from world 3 on. At world 3 it also fires, once each, for your first two
worlds, home included. You choose every time, and your starting house sets what breaking costs you
**(default, open)**. A world's own Held and Broken results come from that house's file, section D.

| Price tier | Starting houses | What breaking a world costs you, each time |
|---|---|---|
| Low | Mars, Saturn | Home unrest +5. Both already preach a wider citizenship |
| Medium | Earth, Moon | Home income −15% for 10 minutes, home unrest +10 |
| High | Jupiter, Venus, Mercury | Home income −25% for 15 minutes, home unrest +20, and your house's court-revolt card (its file, beat 3) |

Mercury in the High tier is an invention. Lakedaimon cannot move without its helots, and a king who frees them
answers to five ephors the same day.

A chained world whose breaking point fires and is not put down **breaks itself** (invented). It counts as broken, it
gives half the Broken gift (`selfBrokenGift`), and you pay no house price, because you did not choose it. Every house
that read you as a conqueror reads it as weakness: standing −5 with each surviving house.

---

## 2. The director

One director, the one in `src/lib/motivation/director.ts`. It already has the shape this needs: build-up, peak,
relax. This section says how the endgame cards ride on it.

### 2.1 The deal

Every tick (`tick`, 60 s) the director looks once at the game and deals **at most one** card. It looks in this order
and takes the first thing that is due:

1. **A beat card** whose worlds-held trigger has been met (section 10). Beats never expire.
2. **A breaking-point card** from a world you hold.
3. **A rival scene** (the house file's section E lines for this beat).
4. **A house card** from the deck of a house you are at war with, allied to or holding.
5. **A shared card** (section 9).

Weights inside steps 4 and 5: a house you are fighting weighs 3, an ally 2, any other house 1, the shared deck 2
(`deckWeights`). A card that has fired does not fire again unless it says it repeats; a repeating card waits
`repeatCooldown` minutes.

### 2.2 Pacing

- **Relax.** After any fight ends, nothing new starts for `relax` minutes. Taking a capital counts as a fight
  ending: the player gets the gap to look at what they won.
- **Card gap.** Two cards never fire within `cardGap` minutes of each other, fights or not.
- **Calm-breaker.** If you are winning and nothing has pushed back for `calmMax` minutes, the director sends a raid
  from your blood enemy. At 3+ worlds it sends it from the most Hostile house instead.
- **Stall hold.** If you are not winning and have gone `stallHold` minutes without a new rung, cards from steps 3–5
  wait. Beats and breaking points do not. Threats interrupt winning; they do not pile on a player who is stuck.

### 2.3 One crisis at a time

A **crisis** is any card that spawns ships, opens the gates, starts a breaking point or plays a rival scene with a
fight. There is one crisis slot.

- While the slot is full, other crisis cards queue. The queue holds `queueMax`. A queued house or shared card expires
  after `queueExpire` minutes. Beat cards and breaking points never expire; they wait.
- A queued breaking point's fuse **freezes** while it waits. The player is never handed two burning worlds at once.
- At the Stirring, every chained world rolls at once, but the fuses are staggered `stirStagger` minutes apart, in
  the order you took the worlds.
- **Announcements** (the coalition forming, the march warning, a rival's message) cost no time and may fire while
  the slot is full. They never carry a fight.
- **The one exception** is the betrayal. "The gates open" fires inside the Last Alliance crisis, because the point of
  it is that it arrives while you are already fighting.

### 2.4 Mapping to the code

| ENDGAME beat | `ThreatKind` today | What changes |
|---|---|---|
| World 3, the Reckoning | `coalition` at `coalitionAt: 2` turned | The standing coalition is the drift: Hostile houses raid on `coalitionRaidEvery` |
| World 3 rival raid | `nemesis` | `nemesisEscapes` must be at least 2, so the rival cannot die before the drop |
| World 4, the Stirring | `rebellion` | Rebellion fires from the breaking-point cards, at `rebellionUnrest` |
| World 5, the Last Alliance | `crisisWarning`, `crisis` at `crisisAtTurned: 4` | The Grand Armada is the coalition march |
| After every capital | `counter` | Unchanged: the relief fleet is still due |

Unrest here runs 0–100; the code's 0.5 is 50.

---

## 3. The beats

### 3.1 World 3: the Reckoning

**Trigger.** Worlds held reaches 3, after the relax gap.

**What the player sees.** Three things, one tick apart. The chains-or-broken prompt for the world you just took
(BEAT-3A). The same prompt for your first two worlds, one at a time. Then the diplomacy screen shows every Wary
house's arrow pointing down, and two ticks later the rival's raid (BEAT-3B).

**What the AI houses do.** Every Wary house loses `reckoningDrift` standing toward you at once and again every
`driftEvery` minutes until it reaches Hostile or you raise it. Friendly houses hold. Blood enemies open a second raid
lane. Houses fighting each other (Mars and Jupiter above all) slow their own war: their raids on each other halve
while they watch you.

**Failure modes.**
- The player takes worlds 2 and 3 fast and the relief fleet (`counter`) and the rival are due together. The crisis
  slot stops this; the rival waits.
- The rival hits a world with no garrison while the player is across the system. A raid does not take a world: the
  rival burns its income (`rivalRaidIncomePct` for the scene) and leaves.
- The player has no idea why everyone turned cold. The drift arrows name the cause: "Three worlds. They are counting."

### 3.2 World 4: the Stirring

**Trigger.** Worlds held reaches 4.

**What the player sees.** Each chained world's panel shows a fuse and a garrison bar. Each broken world's panel shows
its gift arriving (that house's file, section D). Then BEAT-4A puts the houses' new reading of you on the diplomacy
screen (ENDGAME.md 3, the broken-count table).

**The roll.** Each chained world gains `stirUnrest`. If its garrison is under `stirGarrison`, its house's breaking
point (that house's file, beat 4 and its section C chain) is queued at once, fuses staggered. If the garrison holds,
the breaking point waits for the world's unrest to reach 50 in the normal way.

**What the AI houses do.** They read the broken count:
- **0.** Truce prices stay. A Hostile house may offer one, unasked, by card.
- **1–2.** Every truce costs double. Saturn and Mars gain `readingStandingShift` toward you; Jupiter and Venus lose
  the same.
- **3+.** No house will truce. Every enemy world's caste rises when you arrive (`riseOnArrival`).

**Failure modes.**
- Four chained worlds and no troops: four fuses. The stagger means the player loses one world's patience at a time
  and can choose which to save. Worlds the player cannot save break themselves (1.2). That is a loss of control, not
  a loss of the game.
- A player who broke everything has nothing to do at the Stirring. The gifts arrive on separate ticks so the beat
  still has a rhythm, and the shared caste cards (SYS-04, SYS-06) unlock.

### 3.3 World 5: the Last Alliance

**Trigger.** Worlds held reaches 5.

**What the player sees.** BEAT-5A, the warning: a countdown of `marchWarning` minutes on the HUD and the map with
every unbeaten house's fleet turning toward your home. During the countdown, BEAT-5B (the ally docks) is dealt. When
the clock runs out, the Grand Armada arrives at your home, led by the rival.

**What the AI houses do.** Every house you have not beaten joins (section 4). Each sends its capital ship and half
its cruisers; its destroyer and the rest stay home. Members fly in one fleet but keep their feuds: blood-enemy pairs
will not cover each other. Their yards build `coalitionMobilise` times faster while it stands.

**Failure modes.**
- Only one house is left unbeaten. There is no alliance, only that house's march. It still gets the rival and the
  warning.
- The player is far from home when the clock runs out. The home station fights on its own garrison and guns for
  `homeHold` minutes before it can fall. That is the window to get back.
- The march takes the home before the betrayal means anything. The gates open only once the player is in the fight,
  or after `gatesFallback` minutes if they never arrive.

### 3.4 World 6: the Katabasis

**Trigger.** Worlds held reaches 6 and you are not in exile. The target is the one capital left.

**What the player sees.** BEAT-6A names the target and its twist (ENDGAME.md's table). Then the four stages: shared
rules in section 6, each house's detail in its file, section F.

**What the AI houses do.** One house is left. It pulls every ship it has home. If the coalition still stands, its
surviving members' fleets come too, if their cohesion holds. The rival commands the defence.

**Failure modes.**
- The player arrives under-gunned and grinds against stage 1. The retreat rule (6.3) lets them leave and come back
  without losing the stages they finished.
- The player kept no troops. The drop needs infantry. BEAT-6A shows the troop count in red under `dropMinTroops`, and
  the deserter card (SYS-09) is weighted up.

### 3.5 World 7: the end

**Trigger.** Worlds held reaches 7, by conquest or by the last house submitting as a vassal.

**What the player sees.** The ending screens (section 8). The game stays playable afterwards: the director stops
dealing war cards and deals only unrest, so a held world can still rise.

---

## 4. The coalition

### 4.1 Who joins

Every house whose capital you do not hold, and that is not your vassal, joins at world 5. Two exceptions:

- **Mercury** joins as companies, not as a house. Its ships fly under contract for whichever member paid most. You
  can outbid them (SYS-03).
- **The Moon** sends its Thesauros and no fighters, and declares no war of its own. If any coalition ship fires into
  Pytho's space, the Moon leaves.

Your ally joins too, unless it is loyal (section 5).

### 4.2 Cohesion

Each member has a **cohesion** from 0 to 100 (invented). It starts at `cohesionStart`, minus `cohesionBloodFeud` for
each blood enemy also in the coalition and `cohesionClaimFeud` for each claim-feud house. At 0 a member leaves, and if
its blood enemy is still in the fleet, the two fight each other on the spot.

| Event | Cohesion change |
|---|---|
| You destroy a member's capital ship | That member −30 |
| A member's ship is hit by another member's fire | Both −10 |
| A member's blood enemy fails to cover it in a fight you win | That member −15 |
| A member's own world rises (broken 3+, you arrive) | That member −20, and it sends half its fleet home |
| You outbid a member for a Mercury company | That member −10 |
| The coalition wins a fight | Every member +5 |
| The rival takes command | Every member +10, once |

A Mars–Jupiter coalition opens with each at 60 − 25 = 35, plus 10 for the rival. One capital ship lost and one of
them is out.

### 4.3 How the player splits it

1. **Hit the right one.** Strike the member whose blood enemy is also in the fleet. The blood enemy will not cover
   it, which costs another 15. Two fights and the feud breaks open.
2. **Buy the mercenaries.** Outbid a member for its Mercury company. The company turns in the fight (SYS-03).
3. **Raise their low castes.** At broken 3+, fly through a member's home space. Its caste rises and it goes home.
4. **Truce.** Only at broken 0. One member, at the normal price, leaves for `truceLength` minutes and comes back
   Hostile.
5. **Bait the sanctuary.** Lead the coalition into Pytho's space. A coalition shot that lands there drives the Moon
   out and calls a Sacred War on the member that fired. If your own shot lands, the Sacred War is on you.

A coalition under two members is **broken** (`breakCoalition`). It re-forms when you take the next world, with every
cohesion reset.

---

## 5. The betrayal

### 5.1 Which ally

At world 5 the director picks the house with the highest standing toward you that is Friendly or better and is not
your vassal. Ties go to the house that has been Friendly longest. If no house is Friendly or better, nobody betrays
you, and the coalition is one house bigger.

**Hostage-held** (invented, to make ENDGAME.md's hostage rule playable): you took the capital in chains, but the
house's fleet survived and flies with you under its own flag. Its capital counts as held. It can still be the chosen
ally, and it is always loyal.

### 5.2 The odds

ENDGAME.md rules it and this file keeps it: **it betrays you unless your standing with it is 100, or you hold its
capital in chains.** That is certain, not rolled. What the player can read are the tells:

- From world 4, every `tellEvery` minutes, a tell card fires from that ally with chance `tellChance` (SYS-02, and the
  ally's own beat 5 card in its file). A player who has seen two tells knows.
- From world 4 the ally's standing is shown as a number. 99 is not 100.

### 5.3 The counterplay

- **Max the standing.** Gifts, its blood feud joined, its asks answered. At 100 it is loyal.
- **Take a hostage.** Hold its capital in chains. It will not open your gates with its own palace under your guard.
- **Choose your betrayer.** Raise a different house above it before world 5. The betrayer is whoever is highest, so
  the player picks it by picking whom to flatter.
- **Keep it away from home.** The gates matter only at the home station. Refuse its dock (BEAT-5B) and the damage is
  smaller.

### 5.4 A loyal ally names its price

A loyal ally sends BEAT-5D: one of your worlds, or its blood enemy wiped out. Refusing drops it to Wary and it leaves
the war. Mercury has no blood enemy, so its price is always a world. At broken 3+ a loyal ally asks nothing: it has
seen what you do to houses, and it stays out of your way.

### 5.5 "The gates open" in play

When the Grand Armada reaches your home, once the player is in the fight (or after `gatesFallback`):

- Home station guns and shields go dark for `gatesOpen` minutes.
- Home garrison −`gatesGarrison`, doubled if you let the ally dock.
- Every wingman that ally gave you turns hostile where it is.
- The ally's own ships, flying in your home space as friends, open fire.
- The ally goes to Hostile and its standing locks for the rest of the game (`flag('betrayer:<house>')`). It is not a
  blood feud, but in practice it never moves again.

The home can still be held. The gates are a hole in the wall for a few minutes, and the player's job is to fill it.

---

## 6. The Katabasis: shared rules

### 6.1 The four stages

| Stage | What it is | Ends when | Timer |
|---|---|---|---|
| 1. The fleet | The last house's capital ship, destroyer and every ship it has, in orbit | The capital ship dies | None; a reinforcement wave every `kReinforce` minutes |
| 2. The armour | The god-armour shell (GOD-ARMOUR.md): gun hardpoints and shield sections | `kArmourSections` sections are down over one landing cell | Sections regrow one at a time after `kArmourRegen` |
| 3. The drop | Carriers and drill boarders through the air; the rival's last stand | The rival is killed, captured or turned, and `dropMinTroops` troops are down | `kDropWindow` from the first carrier launching |
| 4. The palace | The infantry hold the capital site against the counterattack | The hold timer runs out with troops alive | `kHold` |

Each capital's twist bends stage 3 or 4 (its file, section F). These rules stay the same everywhere.

### 6.2 Timers

- Stage 2's regrowth runs only while no player ship is inside the armour's shell. Pressing keeps the hole open.
- Stage 3's window is the air: a carrier that launches after it closes meets the regrown sections and is shot down.
- Stage 4's hold counts down only while at least one of your troops is in the palace cell.

### 6.3 The retreat rule

You can leave at any time by jumping out. What you keep depends on where you stopped:

| You leave during | You keep | You lose |
|---|---|---|
| Stage 1 | Every kill | Nothing else; the enemy repairs at its normal rate |
| Stage 2 | Stage 1 stays done for `kHoldStage` minutes | Downed shield sections regrow |
| Stage 3 | Stages 1–2 for `kHoldStage` minutes | Every troop on the ground. The rival gets away |
| Stage 4 | Stages 1–2 for `kHoldStage` minutes | Every troop on the ground |

After `kHoldStage` minutes the house rebuilds one stage: a new capital ship from the coalition yards, or the armour
back at full. A full reset comes only if you stay away twice that long.

### 6.4 What carries between stages

- Hull damage on every ship, yours and theirs. No repairs mid-fight.
- Troops and pilots. A pilot lost in stage 1 is not in a carrier at stage 3.
- The rival's state. If the rival's flagship ran in stage 1, it is the target in stage 3.
- The rising. If the target's caste rises on arrival (broken 3+), stage 4's counterattack loses `riseHold` of its
  troops. The house file says what the rising looks like there.

---

## 7. Exile

### 7.1 How it happens

The Grand Armada takes your home: `loseWorld(home)`, `exile()`. You move with your fleet and bay to the held world
with the highest garrison plus income. The broken count drops if home was broken. You hold out until you hold
nothing; then the game ends on the rival's screen (8.4).

### 7.2 The rival holding it

The rival becomes **governor of your home**. They hold it with the coalition's capital ships for `exileStay` minutes;
then the members go home one at a time, lowest cohesion first, and the rival keeps their own house's ships. Every
`exileUnrest` minutes in exile, every world you hold gains unrest `exileUnrestStep`, because your people can see who
sits in your capital.

The rival changes the world while they hold it. If your home was broken, they put it back in chains
(`chainWorld(home)`), and you choose again when you take it back. If it was chained, they offer its caste freedom to
win it over, and its unrest falls to 0 under the rival. The rival's lines for this come from the house file's World 5
scene.

### 7.3 The campaign back

Retaking your home is a short Katabasis: stage 1 (the rival's ships) and stage 4 (the palace). Stage 2 is skipped,
because your own armour still knows your codes. Stage 3 is the rival's last stand, early: kill, capture or turn,
under the normal rules. If the rival falls here, their school's next graduate takes the role at World 6
(`nemesisPending` in the code) with a new rolled name. Taking home back gets the chains-or-broken prompt. While you
are in exile the Katabasis waits, even if worlds held reads 6.

---

## 8. The ending screens

### 8.1 Structure

1. **Title.** The ending's name over the system map, every held world in your colour. One line under it: "The year
   6000. Three thousand years after the Founding."
2. **The slideshow** (8.2), one slide per world, `slideSeconds` each, skippable.
3. **The rival.** Portrait and one line for how it ended: killed, captured or turned (the house file, section E).
4. **The count.** "Worlds broken: n of 7." Then the ending's sentence from ENDGAME.md section 3.
5. **Continue or main menu.**

### 8.2 The slideshow order

1. Your home world first.
2. Every other capital in the order you took it.
3. The betrayer's world where it falls in that order, with a second caption: "Opened the gates." A loyal ally's
   world gets "Kept faith."
4. A vassal's world is last but one. A world retaken from exile shows once, at the retaking.
5. The capital you dropped on is always last.

### 8.3 What each slide shows

- The world's art in your colour, and a chip: **In chains**, **Broken** or **Broke itself**.
- The house's paragraph for the global ending, pulled from that house's record: `<house>.epilogue.sovereign`,
  `.uneasy` or `.breaker` (each house file, sections H and I).
- Under it, the caste's one-line fate, from ENDGAME.md section 2's Held or Broken column by the world's state. The
  model line is ENDGAME.md's own: "Lakedaimon still runs west; nobody is made to lay its rail."

When the global ending and a world's state disagree (a broken world in a Sovereign ending), the paragraph stays the
global one and the chip and caste line carry the difference.

### 8.4 The rival's ending (game over)

The same structure, reversed. The title is the rival's name and house. The slideshow runs your worlds **in the order
you lost them**. The last slide is your home under the rival's flag. The count line reads "The order stands."

---

## 9. The shared event deck

Twelve cards for every start. Credit figures use the record's `credits` block.

### SYS-01: Two flags, one fleet
- Trigger: coalition standing with two blood enemies in it; a fight with the coalition has just ended.
- Read-aloud: Two coalition captains are shouting on an open channel. One says the other held back while her cruiser
  burned. Half the fleet is pointed at the other half. Your comms officer asks if you want to answer either of them.
- Choices:
  1. Tell the one who lost the cruiser she is right: cohesion(<both>, −15), standing(<her house>, +5)
  2. Say nothing: cohesion(<both>, −5)
  3. Ignore it: the coalition repairs in peace; cohesion(<every member>, +5)

### SYS-02: The envoy stops answering
- Trigger: worlds held 4+; an ally at Friendly or better; standing under 100. Repeats.
- Read-aloud: Your ally's envoy has not answered in a day. A deputy answers instead, too politely, and asks how many
  guns your home station carries. The deputy says it is for the joint defence.
- Choices:
  1. Give the number: standing(<ally>, +5), flag(ally-has-guns)
  2. Refuse and ask why: standing(<ally>, −10), flag(betrayal-seen)
  3. Ignore it: flag(ally-has-guns)

### SYS-03: A second offer
- Trigger: a Mercury company is under contract to you; a Hostile house is in the field.
- Read-aloud: The company's captain calls you. Someone has offered more to turn round, and she tells you the figure.
  She has never broken a contract, she says. Contracts end.
- Choices:
  1. Match it: credits(−matchBid), standing(mercury, +5)
  2. Let her go: spawnRaid(mercury, 2, 1, 0, 0)
  3. Outbid by half again: credits(−outbid), standing(mercury, +10), cohesion(<bidder>, −10)

### SYS-04: A letter from the low decks
- Trigger: broken count 1+; worlds held 3+; an enemy capital in chains.
- Read-aloud: A message reaches you inside a cargo manifest. It is from the workers on an enemy world. They know what
  you did on the last one. They list the hours the guards change. They ask when.
- Choices:
  1. Tell them soon: flag(caste-ready:<world>), unrest(<world>, +20)
  2. Tell them to wait: flag(caste-waiting:<world>)
  3. Sell the letter to their masters: credits(+sellLetter), standing(<house>, +10), card(SYS-06)

### SYS-05: The overseers want paying
- Trigger: three or more held worlds in chains.
- Read-aloud: The overseers on your chained worlds have stopped work together. They are the people paid to keep the
  workers working, and they want a raise. From you, today.
- Choices:
  1. Pay them: credits(−overseers)
  2. Put your own troops in their place: troops(−3), unrest(<each chained>, −5)
  3. Ignore it: unrest(<each chained>, +15)

### SYS-06: Word travels
- Trigger: a world breaks, by your hand or its own; you hold a chained world of another house.
- Read-aloud: Someone on your chained world has painted the freed world's name on the side of an ore hauler. By the
  next shift it is on six of them. The overseers ask what to do about the paint.
- Choices:
  1. Scrub it and double the guard: garrison(<chained>, +2), troops(−2)
  2. Leave it: unrest(<chained>, +15)
  3. Break this world too: breakWorld(<chained>), plus your house's price

### SYS-07: The rival writes
- Trigger: the rival has escaped you at least once; worlds held 4+.
- Read-aloud: A message from the rival, sent in the clear so everyone reads it. It lists the worlds you hold and the
  people in each. At the end it asks which list you think they are on.
- Choices:
  1. Answer in the clear: standing(<rival house>, −5), flag(rival-answered)
  2. Answer in secret: flag(rival-channel)
  3. Ignore it: unrest(<each held>, +5)

### SYS-08: A contract on your head
- Trigger: worlds held 3+; Hostile with any house that is not Mercury.
- Read-aloud: Lakedaimon posts a contract the way it posts everything, short and public. Your name, your ship and a
  figure. Three companies sign within the hour. One of them used to fly for you.
- Choices:
  1. Buy the contract back: credits(−buyBack), standing(mercury, +5)
  2. Post one on the house that paid: credits(−counterContract), contract(<payer>)
  3. Ignore it: spawnRaid(mercury, 4, 2, 0, 0)

### SYS-09: Deserters
- Trigger: broken count 3+; coalition standing.
- Read-aloud: Two coalition troop carriers break formation and go dark. When their transponders come back on, they
  are in your bay. Everyone inside was born on worlds you broke. They want to fight, and they want paying.
- Choices:
  1. Take them on: troops(+4), credits(−deserters)
  2. Send them back to their officers: standing(<their house>, +10)
  3. Ignore it: troops(+2), unrest(home, +5)

### SYS-10: Prisoners
- Trigger: you have destroyed a coalition capital ship.
- Read-aloud: Your boarders bring the flagship's crew up in a line. Officers at the front, in good coats. At the back,
  the people who ran the engines, in no coats at all. Their house wants the front of the line back.
- Choices:
  1. Ransom the officers: credits(+ransom), standing(<house>, +5)
  2. Keep the officers and free the engine crew: pilots(+2), standing(<house>, −10)
  3. Ignore it: the house takes them back in its next raid; standing(<house>, −5)

### SYS-11: The three-thousandth lamp
- Trigger: worlds held 2+; once per game, inside the first two hours.
- Read-aloud: Founding Day, three thousand years on. Earth lights a lamp for every colony it sent out, and the lamps
  are on every screen in the system. Your station chief asks whether to light one back.
- Choices:
  1. Light it: standing(earth, +10), standing(mars, −10), standing(saturn, −5)
  2. Leave it dark: standing(earth, −5), standing(mars, +5)
  3. Ignore it: flag(lamp-unanswered); standing(earth, −5)

### SYS-12: The rival's terms
- Trigger: you are in exile.
- Read-aloud: The rival speaks from your own palace, from your chair. They offer you the worlds you still hold, as a
  governor under their flag. You keep your ship. You keep your name, if you never use it again.
- Choices:
  1. Refuse on an open channel: unrest(<each held>, −10), standing(<rival house>, −10)
  2. Pretend to think it over: flag(rival-waiting); the coalition stays `exileStay` minutes longer
  3. Ignore it: unrest(<each held>, +10)

---

## 10. Beat cards

The system's own cards, dealt by the beats. Each house file adds its own on top for each beat.

### BEAT-3A: Chains or broken
- Trigger: you take a capital with worlds held 3+; once each for worlds 1 and 2 when worlds held reaches 3.
- Read-aloud: The palace is yours. Below it, the people who keep this world running have stopped work to watch your
  ships come down. Their overseers are at the gate, waiting for your order.
- Choices:
  1. Keep the chains: chainWorld(<world>), unrest(<world>, +10)
  2. Break them: breakWorld(<world>), unrest(<world>, −20), plus your house's price (1.2)

### BEAT-3B: The newest world burns
- Trigger: worlds held reaches 3; after every BEAT-3A has resolved.
- Read-aloud: Your newest world calls for help. A cruiser in your blood enemy's colours is hitting its yard. Its
  captain opens a channel long enough to say your name and let you see their face.
- Choices:
  1. Go now: rivalScene(w3-raid), spawnRaid(<rival house>, 2, 2, 0, 0)
  2. Send the garrison up: garrison(<world>, −2), income(<world>, −10%)
  3. Ignore it: income(<world>, −20%), rivalScene(w3-taunt)

### BEAT-4A: The reading
- Trigger: worlds held reaches 4.
- Read-aloud: Every house has sent the same question in the same hour. They want to know what you are. Your answer is
  already on the panel beside each world you hold.
- Choices:
  1. Read it: applies the broken-count table (3.2) to every standing

### BEAT-5A: The Grand Armada
- Trigger: worlds held reaches 5.
- Read-aloud: The houses that hate each other have stopped, for now. Their fleets are turning toward your home. The
  rival's flagship is at the front. You have minutes.
- Choices:
  1. Go home: flag(home-defended)
  2. Strike the weakest member first: cohesion(<lowest>, −15) if you win before the clock runs out
  3. Send envoys (broken 0 only): truce(<one member>, truceLength) at the normal price

### BEAT-5B: The ally docks
- Trigger: BEAT-5A has fired; a betrayal candidate exists (5.1).
- Read-aloud: Your ally's fleet has come to help. Its admiral asks to dock at your home station and take on fuel. The
  dock master is holding the clamps open, waiting for your word.
- Choices:
  1. Let them dock: flag(ally-docked)
  2. Refuel them outside the guns: standing(<ally>, −5)
  3. Refuse: standing(<ally>, −15), flag(ally-refused)

### BEAT-5C: The gates open
- Trigger: the Grand Armada is at your home; the ally betrays (5.2).
- Read-aloud: Your station's guns go quiet all at once. On the channel your ally's admiral is reading out your codes,
  slowly, to someone else. Their ships are already inside your defences, and they are turning.
- Choices:
  1. Fight: flag(gates-open), garrison(home, −gatesGarrison), flag(betrayer:<ally>)
  2. Run for the station core to restart the guns: the gates close after half the time; flag(betrayer:<ally>)

### BEAT-5D: A loyal ally's price
- Trigger: BEAT-5A has fired; the ally is loyal; broken count under 3.
- Read-aloud: Your ally will stand with you. Its envoy says so plainly, then puts a list on the table. One name is on
  it: a world of yours, or a house it wants gone.
- Choices:
  1. Give the world: loseWorld(<chosen>), flag(ally-paid)
  2. Promise the house: flag(ally-target:<blood enemy>), flag(ally-paid)
  3. Refuse: standing(<ally>, −40); the ally leaves the war

### BEAT-6A: The descent
- Trigger: worlds held reaches 6; not in exile.
- Read-aloud: One capital left. Everything it owns is in orbit round it, and the god-armour is lit. The rival is
  there. Your carriers are full, or they are not. Below the armour is the palace.
- Choices:
  1. Begin: stage 1
  2. Wait and build: SYS-09 weight doubles; the house's yards build at `coalitionMobilise`

---

## 11. Two playthroughs

Times are from the first undock, at the level of beats. They are a guess at pacing for Palamedes's simulator to test
(`paceGuess` in the record).

### 11.1 Earth, ending as the Breaker

- **0:00.** Undock at Pharos Station. Two Martian fighters inside the minute. The Moon is Friendly; Venus courts you.
- **0:40.** Take Astu (Saturn). Saturn ignored Earth anyway, and Mars and Jupiter lose the ice they wanted. Held 2.
- **1:30.** Take Urbs Arsia (Mars), the blood enemy, early and at a cost. **The Reckoning.** BEAT-3A three times:
  Mars broken (the general's legions come over), then Earth, then Saturn. Breaking Earth is Earth's own reveal (Earth,
  beat 3): the Ark at Lagrange Yard was a caste. Earth's Medium price, three times over. Broken 3.
- **1:34.** The rival, a Campus Martius graduate whose house just fell, hits Astu's docks and runs. From now on they
  lead what is left of the Martian fleet.
- **2:00.** Venus, Jupiter and Mercury slide from Wary toward Hostile. SYS-11 fires; the player lights the lamp.
- **2:30.** Take Lakedaimon (Mercury). **The Stirring.** No chained worlds; each broken world's gift lands on its own
  tick. Mercury broken: the rail stops and the player rebuilds it with free hands (Mercury, beat 4). Broken 4. No
  house will truce now.
- **3:30.** Take Nephelokokkygia (Venus). Broken 5. **The Last Alliance.** Moon and Jupiter remain. The Moon is the
  ally at standing 80. SYS-02 fired at 2:50 and 3:10; the player saw both and could not get to 100 in time.
- **3:42.** The Grand Armada reaches Earth: Jupiter's Tessarakonteres and cruisers, the rival with the Mars remnant,
  the Moon's Thesauros. The player refuelled the Moon outside the guns (BEAT-5B, choice 2). **The gates open** at
  3:44. Home holds with 2 garrison left.
- **4:20.** Jupiter's cohesion sits at 45 beside its blood enemy's remnant. The player kills the Tessarakonteres;
  the Mars remnant does not cover it, and Jupiter goes home. The coalition breaks.
- **4:40.** Take Kallistopolis (Jupiter). Broken 6. The false heir leads Io out (Jupiter, beat 4). Held 6.
- **4:45.** **The Katabasis** at Pytho. Nobody Friendly with the Moon is left to call a Sacred War. Stage 1 to the
  Thesauros, stage 2 through Selene's Veil, stage 3 into the crater walls of Copernicus and the rival's last stand.
  Mars was broken at 1:30, so the player **turns** the rival.
- **5:20.** The palace holds. Pytho broken; the vaults open. Broken 7: **the Breaker.** The slideshow runs Earth,
  Saturn, Mars, Mercury, Venus, Jupiter, and the Moon last, captioned "Opened the gates."

### 11.2 Jupiter, ending as the Sovereign

- **0:00.** Undock at First Crown. The belt war with Mars is already burning; Venus is a claim rival. No ally is safe.
- **0:45.** Take Astu (Saturn), the "cousins". Held 2. Mars wanted Titan's ice and now has to come through you.
- **1:40.** Take Nephelokokkygia (Venus). **The Reckoning.** BEAT-3A for Venus, Jupiter and Saturn: chains on all
  three. Broken 0. Earth, the Moon and Mercury drift. The player starts paying Mercury contracts to keep it close.
- **1:44.** The rival, a Campus Martius graduate, raids Venus's cloud docks and gets away.
- **2:40.** Take Pytho (the Moon). Earth is Friendly with the Moon and declares the **Sacred War**. **The Stirring**
  is due in the same hour; the crisis slot holds it until Earth's raid is over. Four chained worlds, fuses four
  minutes apart. Saturn's fires first (Saturn, beat 4); the player garrisons it. Venus's fires second, a cloud city
  losing lift (Venus, beat 4). No troops to spare: Venus **breaks itself**. Half a gift, no court revolt, −5 with every
  surviving house. Broken 1.
- **3:20.** SYS-05: the overseers want paying. The player pays.
- **3:50.** Take Quito Skyport (Earth) in chains. Held 5. **The Last Alliance.** Mars and Mercury remain. Mercury is
  the ally, bought up to 100. No betrayal. BEAT-5D: Mercury has no blood enemy, so it asks for a world. The player
  gives it Astu. Held 4.
- **4:05.** The Grand Armada is Mars and the rival, plus the companies Mars could afford, which is few. Home holds.
- **4:30.** The player retakes Astu from Mercury's garrison by agreement (held 5). Mercury is Allied and the vassal
  route is open at 5 held (default, open). Mercury **submits**. Held 6, Saturn and Mercury both in chains.
- **4:50.** **The Katabasis** at Urbs Arsia. Stage 1 against the Rostrata and its escorts. Stage 2 through the
  Ancile. Stage 3: drill boarders through the lava-tube rock, because the skylights are guarded. Mars is chained, so
  the rival cannot be turned. The player **captures** them on their flagship.
- **5:25.** The palace holds. Mars in chains. Broken 1: **the Sovereign.** The slideshow runs Jupiter, Saturn, Venus
  ("Broke itself"), the Moon, Earth, Mercury ("Kept faith", the vassal, last but one), and Mars last.

---

## 12. New effects needed

```
income(world, ±n%, minutes)  # a timed income change; the price tiers and the rival's raid need it
cohesion(house, ±n)          # moves a coalition member's cohesion (4.2)
leaveCoalition(house)        # takes a member out now; it goes home
submit(house)                # the house becomes your vassal: counts as held, stays chained
contract(target)             # a Mercury company is hired against target; credits paid separately
truce(house, minutes)        # a bought truce; decays back to the old standing
```

## 13. The record

```ts
// Every number FIRST PASS, for Palamedes review.
export const ENDGAME_SYSTEM = {
  year: 6000, foundingYear: 3000, // Caleb's ruling, 2026-10-20
  numbers: {
    tick: 1, relax: 3, cardGap: 4, calmMax: 12, stallHold: 15, // minutes
    deckWeights: { fighting: 3, ally: 2, other: 1, shared: 2 },
    repeatCooldown: 20, queueMax: 3, queueExpire: 15, stirStagger: 4,
    priceTiers: {
      low: { homeUnrest: 5 },
      medium: { homeIncomePct: -15, minutes: 10, homeUnrest: 10 },
      high: { homeIncomePct: -25, minutes: 15, homeUnrest: 20, courtRevolt: true },
    },
    selfBrokenGift: 0.5, selfBrokenStanding: -5,
    reckoningDrift: -10, driftEvery: 5, rivalRaidIncomePct: -20,
    stirUnrest: 20, stirGarrison: 3, rebellionUnrest: 50,
    readingStandingShift: 10, truceBase: 200, truceMultiplier: { 0: 1, 1: 2, 2: 2 }, truceLength: 15,
    riseOnArrival: -2, // enemy garrison when you arrive at broken 3+
    marchWarning: 12, homeHold: 4, gatesFallback: 6, coalitionMobilise: 1.25,
    cohesionStart: 60, cohesionBloodFeud: 25, cohesionClaimFeud: 10,
    cohesion: { capitalLost: -30, friendlyFire: -10, notCovered: -15, worldRises: -20, outbid: -10, win: 5, rival: 10 },
    tellEvery: 8, tellChance: 0.5,
    gatesOpen: 4, gatesGarrison: 3,
    kReinforce: 4, kArmourSections: 3, kArmourRegen: 8, kDropWindow: 3, dropMinTroops: 6, kHold: 5,
    kHoldStage: 10, riseHold: 0.5,
    exileStay: 15, exileUnrest: 10, exileUnrestStep: 10,
    vassalMinHeld: 5, vassalStanding: 60,
    slideSeconds: 6,
    paceGuess: { w2: 40, w3: 90, w4: 150, w5: 210, drop: 285, end: 320 }, // minutes
  },
  credits: { // scale: a cruiser kill pays 25, a capital kill 120
    matchBid: 60, outbid: 90, sellLetter: 80, overseers: 100, buyBack: 150, counterContract: 120,
    deserters: 40, ransom: 120,
  },
};
```
