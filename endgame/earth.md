# Earth: the Humans (endgame section)

> DRAFT, 2026-10-20, written to `CONTRACT.md`. Sources: LORE.md (integration-3), FEUDS.md, ENDGAME.md, GOD-ARMOUR.md,
> DESTROYER.md, INFANTRY-CARRIER.md, CONQUEST.md. Dates follow Caleb's ruling of 2026-10-20: the game year is 6000 and
> the Founding was around 3000. Every number is FIRST PASS and lives in section I under `numbers`; the cards name the
> key, not the value, so Palamedes can change one line. `troops(n)` counts squads of 10 (INFANTRY-CARRIER.md).
> Placeholder class names used as they stand: *Harrier* (destroyer, DESTROYER.md), *Gangway* (carrier, INFANTRY-CARRIER.md).

## A. The house at the endgame

Late in the game Earth is still the largest power in the system and the slowest to move. Its navy is every member
nation's ships under one elected Strategos: Metropolis carriers out of Lagrange Yard, Harrier destroyers, Pathfinder
cruisers and Sparrow wings off the carrier decks. Each hull flies its own nation's flag beside the blue League band. In
a long fight you can watch the flags start to argue.

Its fear is the one LORE.md gives it. The colonies might combine against it, and the editing might turn out to be the
better choice. By world 5 the first has happened. The Ark at Lagrange Yard says the Synedrion stopped believing the
second some time ago.

What it wants from the war is to still be the metropolis when it ends: the mother city, with the daughters back in
the League on Earth's terms and Mars made to say the Secession was a mistake.

- **At the Reckoning (3 worlds).** War needs two thirds of the Synedrion, so Earth drifts toward Hostile one band
  slower than the other Wary houses, and it sends a treaty before it sends ships: a truce at a price
  (`reckoningTruceCost`). For a Mars player nothing changes. The blood feud holds.
- **In the Last Alliance (5).** Earth brings the most hulls and the least unity, and its Strategos claims command. If
  Mars is in the alliance too, their blood feud holds: the two fleets will not share a battle line. Cripple the
  Metropolis flagship first and the Martian ships hold back to watch Earth burn (`flag(alliance-mars-holds)`).
- **As your ally at the betrayal.** Earth betrays by vote, in closed session, and in writing. It signs with the
  alliance and opens Pharos Station's gates "under the treaty". A loyal Earth names its price instead: the Moon, if you
  hold it, otherwise Mars wiped out.

## B. The caste: contract hands

**Where the edit came from.** Earth edited no one, and that is the story it tells. The work it cannot do is in
orbit. Lagrange Yard's kilometre-long docks, Pharos Station and the Clarke Belt Relays all run in free fall or spin,
where unedited bones thin within a year. Within a lifetime of the Editing (around 3200), the Synedrion voted the first
labour treaty, the Contract of Pharos: Earth would hire the bodies it refused to make. Mercury's helots took the hot
work on the sunward frames. The Moon's bonded, sold on by the treasuries that hold their debt, took the long free-fall
shifts. Nearly three thousand years later the treaty has never lapsed. Every Strategos signs it in the first week of
office, and nobody reads it.

**What the edit does to the body.** Theirs, not Earth's. The Mercury hands are dark-skinned and lean, with the second
clear eyelid that lets them weld facing the Sun. The Moon hands are long in the spine, thin in the bone and small in
the heart. Both can work a shift in free fall that would put a Human in a frame. Neither can stand on Earth. They
live their whole contracts in orbit, under a planet with the only open sky in the system, and never go down the
tether.

**The Ark.** Dry Dock One at Lagrange Yard has held an Ark "for an unannounced colony" since 5940. Inside its turning
ring are Earth's first edited children: short, thick-boned, broad in the hand. They work free fall like a Moon hand
and stand up at a full 1 g like a Human. No colony ever made that body, because no colony needed to work in orbit and
walk on Earth. The yard paperwork calls them *Ark crew*. A closed committee of the Synedrion, the Yard Committee,
decided it across twelve Strategoi. Each one was told in the same week as the Contract, and each one signed.

**A day of work.** The bell at Pharos rings the 24-hour clock; the Moon hands keep it as a holy duty and the Mercury
hands keep it because the Moon hands won't stop. Each hand clocks in at the tally board, and the hours bill to a member
nation's contract. Twelve hours on the dock frame, tethered, welding a Metropolis hull plate by plate. The Human
supervisors ride up the tether for a week at a time, wearing wrist weights and looking at the floor. The shift ends,
the hands eat in the spin ring at Moon gravity, and the Earth they never stand on fills the window.

**Their word.** The polite word is *contract hands*; Earth's forms say *the contracted*. They call themselves
**the Ink**, because the only part of them that ever reaches Quito is a signature.

**Their saying.** "Earth never made us. It only bought the ones who were."

**What they want.** An end date the yard keeps. Wages paid at home, in Lakedaimon or Pytho, and the Ark crew out of
that ring. The oldest of them want one more thing they will never get: to stand under the open sky once.

**Two leaders.**
- **Aster**, Hemerodrome weld boss of Dry Dock Four. *Wants:* to march her company home to Lakedaimon with the
  contract kept to the hour, because on Mercury a broken contract shames the whole company. *Lie:* she tells her crew
  the yard has never sent them into Dry Dock One. She led the team that welded the Ark's ring.
- **Melite**, Selenite keeper of the Yard ledger. *Wants:* to clear her family's debt to the Treasuries and get home
  to Pytho before her bones thin past what a frame can carry. *Lie:* that every hour in her ledger is true. For years
  she has billed the Ark crew's hours to contracts that ended long ago. A Selenite caught forging a record is exiled
  to Earth, where she cannot walk, and she already lives one tether away from it.

## C. The breaking point: the Ark at Lagrange Yard

The LORE.md hook: "The Ark being built at Lagrange Yard is for a colony no one has announced." It plays two ways. If
you hold Earth you are in the chair, and the cards ending in `h` fire. If Earth is your enemy you can light the fuse,
and the cards ending in `a` fire. Either way, `flag(ark-revealed)` means breaking Earth later costs no extra unrest.

### earth-bp-1h: Hours for No One
- Trigger: you hold Earth in chains and worlds held ≥ 3; at the Stirring (world 4) it fires early if Earth's garrison is below `chainGarrison`
- Read-aloud: Melite brings you the Yard ledger. Thousands of hours a month, billed to contracts that ended years ago. She points across the yard at Dry Dock One. The Ark's ring is turning. Somebody lives in it.
- Choices:
  1. Open Dry Dock One: card(earth-bp-2h)
  2. Burn the ledger: flag(ark-buried), unrest(earth, +buryUnrest)
  3. Ignore it: flag(ark-rumour), unrest(earth, +ignoreUnrest), card(earth-bp-1h) again after `rumourDelay`

### earth-bp-2h: Dry Dock One
- Trigger: earth-bp-1h, choice 1
- Read-aloud: The ring turns at a full g. Children in yard grey look back at you, short and thick-boned, standing easily. Aster says she welded this ring. She never asked what for. Earth made its own.
- Choices:
  1. Walk them out: breakWorld(earth), flag(ark-revealed), card(earth-bp-3h)
  2. Seal the dock and pay the yard: chainWorld(earth), credits(-sealCost), flag(ark-sealed), unrest(earth, +sealUnrest)

### earth-bp-3h: The Walk-Off
- Trigger: earth-bp-2h, choice 1
- Read-aloud: The Ark crew file out of the ring. Moon hands carry the ones who can't keep up. Aster's company downs tools behind them. Every screen on Pharos is watching, and the Synedrion wants to know who you are now.
- Choices:
  1. Give them the Ark: ships(earth-ark, +1), pilots(+arkPilots), flag(ark-crewed)
  2. Send them down the tether: troops(+arkTroops), unrest(earth, +openSkyUnrest), flag(ark-born-down)
  3. Ignore it: standing(mercury, +ignoreHireStanding), pilots(-arkPilots), flag(ark-crew-hired-away)

### earth-bp-1a: Melite's Ledger
- Trigger: Earth is Hostile or Blood feud, worlds held ≥ 3, and you hold a Mercury or Moon world
- Read-aloud: A Selenite clerk sends you Lagrange Yard's books on a narrow beam. The hours don't add up. Under the last column she has typed one line. The Ark isn't for a colony. Ask me what it's for.
- Choices:
  1. Answer her: credits(-melitePrice), card(earth-bp-2a)
  2. Sell the copy to the League: credits(+sellLedger), flag(melite-exiled)
  3. Ignore it: garrison(earth, +ignoreGarrison), flag(ark-rumour)

### earth-bp-2a: What the Ark Is For
- Trigger: earth-bp-1a, choice 1
- Read-aloud: Melite talks for an hour. A ring at Dry Dock One, turning at a full g. Children edited to work free fall and still walk on Earth. She wants passage to Pytho, and she will send the proof wherever you say.
- Choices:
  1. Send it to the yard: flag(ark-revealed), unrest(earth, +fuseUnrest), garrison(earth, -fuseGarrison), card(earth-bp-3a)
  2. Send it to every house: flag(ark-revealed), standing(venus, +leakStanding), standing(jupiter, -leakStanding), unrest(earth, +leakUnrest)

### earth-bp-3a: The Yard Goes Dark
- Trigger: earth-bp-2a, choice 1, on your next approach to Earth
- Read-aloud: Lagrange Yard's lights go out one dock at a time. The hands have left the frames. The Ark drifts in Dry Dock One with nobody at the helm, and two League Harriers are already turning toward it.
- Choices:
  1. Take the Ark: spawnRaid(earth, arkGuardFighters, 0, arkGuardDestroyers, 0), ships(earth-ark, +1) on the win
  2. Let it drift: income(earth, -yardDarkIncome%), flag(yard-dark)
  3. Ignore it: garrison(earth, +ignoreGarrison), clearFlag(ark-revealed)

## D. Held and broken

**Held in chains.**
- Income: `income(earth, +chainIncome%)`. Earth is the richest world in the system, and the yard keeps building.
- The yard turns out one Metropolis every `yardCycle` director cycles: `ships(capital, +1)`.
- Unrest: +`chainUnrest` at each Stirring roll. The city under the open sky is calm; the unrest is all in orbit.
- Garrison: `chainGarrison` squads at Lagrange Yard, or the breaking point fires early (ENDGAME.md, world 4).
- Earth's purity stays a story. While Earth is chained and `ark-revealed` is unset, Jupiter, which respects the elder
  dynasty, holds +`purityStanding` toward you.

**Broken.**
- The Ark crew walk off and the yard stops: `income(earth, -brokenIncome%)` for `brokenCycles` cycles, and no
  Metropolis from the yard until it is re-crewed with paid hands (`credits(-recrewCost)`).
- What it gives: the Ark (`ships(earth-ark, +1)`), `troops(+arkTroops)` and `pilots(+handPilots)`. The Ark crew are
  the only edited troops in the system who can fight at a full g, so they count double in any drop on Earth.
- Every helot trusts an Earth player more: `standing(mercury, +helotTrust)` and `unrestChained(-helotTrust)` on every
  world you hold in chains. This applies only if your starting house is Earth.
- What it costs with the houses: `standing(jupiter, -purityStanding)` (the elder dynasty's story is gone),
  `standing(moon, -bondedFees)` (the Treasuries lose the hire fees on their bonded), `standing(venus, +heirStanding)`
  (Venus says it was the true heir all along).
- The house price (default, open). If you are Earth, breaking your own world costs you the League: card
  `earth-ev-2` fires at once and one member nation walks out with its ships. Mars and Saturn players break Earth at
  no extra cost. Jupiter and Venus players take the court revolt from ENDGAME.md section 1.

**The unique ship.** *The Ark* (`earth-ark`, 3×, unarmed) is LORE.md's fat brass hull round a turning ring, with the
ring lights left on and the yard numbers scraped off the hull by hand. It carries `arkTroopBays` squads and works as a
forward dock for your fighters.

## E. Earth's officer school and the rival

Earth's own rival is Mars's: a player whose blood enemy is Earth meets a graduate of this school. That is a Mars
player, since Mars ⚔ Earth is the only blood feud Earth has. (Earth players meet the Campus Martius rival; see
`mars.md`.)

**The school: the Strategeion, at Pharos Station.** Named for the office of the Athenian generals. It sits in the
spin ring at the top of the tether. Cadets come from every member nation, ride the tether up on their first day and
do not come down for `cadetYears` years. They study treaty law and the rules of engagement before they touch a gun.
They train in rings spun to every colony's gravity, wrist weights on, so they know what the daughters' bodies can
take. The final test is a mixed-flag squadron where every captain is from a different nation and any of them may
refuse an order. You pass if your line holds. Contract hands cook for the cadets, tend the ring and fly the target
drones. Most graduates cannot name one of them.

**The rival.** Rank: *Navarch*. Rolled from four names: **Tomás Quispe**, **Idris Mensah**, **Hana Lindqvist**,
**Amara Okafor**. The sex is rolled with the name (default, open), and every line below uses the title.
- *Look:* League navy blue with brass fittings and the blue band, and a brass weight cuff on each wrist. Strategeion
  graduates keep the cuffs on for life, so their bones stay Earth's.
- *Flagship:* the Metropolis carrier *First Lamp*, named for the lamp lit on Founding Day. Its island carries every
  member nation's flag in a row.
- *Wants:* the Strategos's year, won by the vote of a Synedrion that has just watched the Navarch break Mars.
- *The lie they tell themselves:* that Earth has never edited anyone. The Navarch signed the Ark's escort orders
  twice and never once went inside Dry Dock One.

**World 3 raid.**
- "By the treaty that ended the Secession, this world was never yours. I've come to file the objection."
- "Your Senate counts its miners and won't let them vote. We at least pay ours."
- (escaping) "Go home, Quirite. I'll see you at Arsia."

**World 5, leading the alliance.**
- "Six houses, one fleet, and the Synedrion gave me command by two thirds. You managed that."
- "Mars left the mother city to be free. Look what you've built instead."
- "The gates are open. Come and see who opened them."

**World 6, the last stand.**
- "Every flag on this line is a nation that sent me, and none of them is running."
- "I trained at the top of that tether. I can finish at the bottom of it." (Quito only)
- (if `ark-revealed`) "You found the Ark. I found out the day you broadcast it."

**How it ends.**
- *Kill:* the *First Lamp* breaks up over the drop zone and the Synedrion can't agree on a successor.
  `xp(+rivalKillXp)`, `credits(+rivalKillCredits)`, `unrest(earth, +rivalDeadUnrest)`, `flag(rival-dead)`.
- *Capture:* a drill boarder takes the Navarch off the bridge with the cuffs still on, and Earth pays the ransom by
  treaty, on the day. `credits(+ransom)`, `flag(rival-captured)`, `rivalScene(earth-rival-captive)`.
- *Turn* (Earth broken only): the Navarch was raised by contract hands at Pharos and watched the Ark crew walk out.
  The *First Lamp* comes over with its Sparrow wings. `ships(capital, +1)`, `pilots(+turnPilots)`,
  `rivalScene(earth-rival-turned)`, `flag(rival-turned)`.

## F. The Katabasis at Quito Skyport

**1. The fleet.** The whole League navy comes home, each ship under its own flag: `homeMetropolis` Metropolis carriers
(the *First Lamp* among them if the rival lives), `homeHarriers` Harrier destroyers, `homePathfinders` Pathfinder
cruisers and `homeSparrows` Sparrows in carrier wings. Pharos Yard's batteries and the two Lagrange Guns (CONQUEST.md)
fire into the fight from orbit. Each Metropolis that dies drops one nation out of the line; at `nationsBreak` nations
gone, the rest pull back to the Vault.

**2. The armour: the Vault of Gaia.** GOD-ARMOUR.md's lattice over the whole globe at 1.118–1.13 R, 66% plated, three
solid belts crossing the poles at 60°, garden terraces in green and gold between the struts, Earth's blue in every
open window. The tether rises from Quito through one window on the equator, the **Tether Gate** (invented here). It is
ringed with `gateEmitters` shield emitters and turret batteries on the belt plates around it. Break the emitters and
the gate opens. Plating elsewhere doesn't need to fall.

**3. The drop: the space elevator.** Once the gate opens, the player chooses.
- *Ride the tether down.* Infantry carriers clamp to the climber track and ride it through the atmosphere. The track
  shields them from the city's guns on one side only, so the descent takes `rideSeconds` s under fire from the other.
  League climber cars come up the track as rams. You land at the tether's foot with the elevator whole. Held Earth
  keeps its road to orbit.
- *Cut it.* Drill boarders cut the tether at the gate. Everything below falls toward the Andes, and the carriers drop
  free in the debris, which covers them (`cutSeconds` s, much faster). You take a city with no way to orbit:
  `income(earth, -cutIncome%)` until a new tether is built (`credits(-tetherCost)`), and `unrest(earth, +cutUnrest)`.
- The Navarch makes the last stand on the climber platform at the tether's foot.

**4. The palace.** Quito Skyport, the Synedrion's chamber at the tether's foot. The troops hold it for `holdSeconds` s
against League marines coming in from Charter Guard. Holding it means holding the League's vote. Every member nation
must then choose: stay under you, or leave with its share of the navy (LORE.md hook 1, card `earth-ev-2`).

**The choice in the middle.** On the ride down, a climber car comes up the track toward your carriers, unarmed. It is
full of contract hands and Ark crew evacuating to Pharos. Hold fire and they pass: your carriers take the rams' fire
for `holdFireSeconds` s longer, and if you later break Earth you get `troops(+evacTroops)`. Fire, and the track is
clear, `standing(mercury, -evacStanding)`, and turning the rival becomes impossible.

**The way to fail.** The carriers die on the track or in the debris, the marines retake the chamber before the hold
timer ends, or (riding) League engineers cut the tether under you. You keep your fleet and lose the troops aboard,
and the Vault's emitters come back after `emitterRepair` s.

## G. The event deck

### earth-ev-1: Founding Day
- Trigger: worlds held 1–2; Earth Friendly or better, or Earth is your house
- Read-aloud: Every nation on Earth lights a lamp for the colonies it sent out three thousand years ago. Night falls on the equator and the coast lights up. A League courier asks whether your world will light one back.
- Choices:
  1. Light it: standing(earth, +lampStanding), credits(-lampCost)
  2. Don't: standing(earth, -lampSnub), standing(saturn, +lampSnub)

### earth-ev-2: A Seat Walks Out
- Trigger: worlds held ≥ 3 and Earth held, or Earth broken while your house is Earth, or Earth is your enemy and has lost a capital ship to you
- Read-aloud: A member nation stands up in the Synedrion, folds its flag and leaves. Its share of the navy follows it out of Pharos. Its admiral is waiting on an open channel to hear what you'll pay.
- Choices:
  1. Buy the ships: credits(-seatShipsCost), ships(cruiser, +seatCruisers), ships(fighter, +seatFighters)
  2. Hunt them down: spawnRaid(earth, seatFighters, seatCruisers, 0, 0), xp(+seatHuntXp)
  3. Ignore it: garrison(earth, -seatGarrison) if you hold Earth; otherwise standing(earth, +seatIgnore)

### earth-ev-3: The Price of Coming Back
- Trigger: worlds held 2–4; Earth Allied or Friendly
- Read-aloud: One of your worlds asks to rejoin the League. The Synedrion argues for a week and can't agree on a price. The Strategos asks you to name one, and promises the vote will follow.
- Choices:
  1. Name a low price: standing(earth, +rejoinStanding), income(<that world>, -rejoinIncome%)
  2. Refuse them both: unrest(<that world>, +rejoinUnrest), standing(earth, -rejoinSnub)

### earth-ev-4: Relay Silence
- Trigger: worlds held 3–5; Earth Hostile or Blood feud
- Read-aloud: The Clarke Belt Relays carry every message between Earth and its daughters. Three relays sit on your side of the ring, lightly guarded. Cut them and Earth's orders take hours to reach its own fleets.
- Choices:
  1. Cut them: spawnRaid(earth, relayFighters, 0, 0, 0), flag(relays-cut), standing(moon, -relayStanding)
  2. Tap them: credits(-relayTapCost), flag(relays-tapped)
  3. Ignore it: flag(relays-intact)

### earth-ev-5: Hands for Hire
- Trigger: worlds held 4; you hold a world in chains with unrest above `handsUnrest`
- Read-aloud: A Lagrange Yard broker docks with a list of contract hands for sale. Mercury welders and Moon riggers, papers in order, three years each. They'll work your yard. They'll never go down to your city.
- Choices:
  1. Hire them: credits(-handsCost), income(<that world>, +handsIncome%), flag(hired-ink)
  2. Buy their papers out and free them: credits(-handsBuyout), standing(mercury, +helotTrust), unrest(<that world>, -handsUnrest)
  3. Ignore it: unrest(<that world>, +ignoreUnrest)

### earth-ev-6: The Treaty in the Drawer
- Trigger: worlds held 5, Earth is your highest-standing ally, before the betrayal resolves
- Read-aloud: The Strategos meets you on Pharos and slides a treaty across the table. It is signed by the alliance and not yet by Earth. Two thirds of the Synedrion is waiting on what you offer.
- Choices:
  1. Give Earth the Moon: loseWorld(moon), standing(earth, +loyalStanding)
  2. Promise Mars wiped out: flag(earth-wants-mars), standing(earth, +marsPromise)
  3. Ignore it: flag(earth-betrays)

### earth-ev-7: The Originals
- Trigger: worlds held 6, you hold Earth
- Read-aloud: Quito's oldest museum holds the originals every colony only has copies of. The curators have packed them in crates on the elevator platform. Six houses want them. Earth wants them left where they are.
- Choices:
  1. Leave them: unrest(earth, -originalsCalm)
  2. Sell them off: credits(+originalsSale), unrest(earth, +originalsUnrest), standing(venus, +originalsStanding)
  3. Send them to Pytho for safekeeping: standing(moon, +originalsStanding), unrest(earth, +originalsMoved)

### earth-ev-8: Open Sky
- Trigger: worlds held 7, Earth broken, the tether intact
- Read-aloud: The Ark crew ask for one thing. A climber car down the tether, and an hour at the bottom. The Moon hands come too, in frames. Most of them have looked at this sky all their lives and never stood under it.
- Choices:
  1. Send the car: flag(open-sky), unrest(earth, -openSkyCalm)
  2. Not yet: unrest(earth, +openSkyRefused)

## H. Endings

**The Sovereign (0–2 broken).** Lagrange Yard runs three shifts and the Ark ring keeps turning, now on your orders.
Earth still tells everyone it never edited a child. The hands still sign three years at a time and never see the
open sky. Founding Day goes on, and nobody lights a lamp back.

**The Uneasy Crown (3–4 broken).** The yard pays by the hour now, and some of the hands go home to Lakedaimon and
Pytho with full wages. The Ark crew are free and have no country. The League still votes, under you, and every member
nation keeps a ship fuelled in case it decides to leave.

**The Breaker (5–7 broken).** The tether's climber cars run down full and come back empty: hands in frames, Ark crew
on their own feet, under the open sky for an hour. Earth isn't the only free people any more, and it was never the
only unedited one either. Founding Day comes round. For the first time, a colony lights a lamp back.

## I. The record

New effects needed:
- `unrestChained(±n)`: changes unrest on every world you hold in chains.

```ts
const earth = {
  caste: 'Contract hands (they call themselves the Ink)',
  edited: 'nothing: hired, not made. Mercury helots (heat, glare) and Moon bonded (free fall); the secret Ark crew are edited for free fall and a full 1 g',
  work: 'Orbit work Earth cannot do: Lagrange Yard docks, Pharos Station, the Clarke Belt Relays',
  breakingPoint: 'The Ark at Lagrange Yard is Earth\'s first edited caste, built in secret since 5940',
  held: 'Earth\'s purity stays a story, and the yard keeps building',
  broken: 'The Ark crew walk off. Earth loses the secret, and every helot trusts an Earth player more',
  rivalSchool: 'The Strategeion, at Pharos Station (rival for players whose blood enemy is Earth: Mars)',
  rivalNames: ['Tomás Quispe', 'Idris Mensah', 'Hana Lindqvist', 'Amara Okafor'],
  lastCapitalTwist: 'Quito Skyport space elevator: ride the tether down, or cut it and take a city with no way to orbit',
  epilogue: {
    sovereign: 'The Ark ring keeps turning, and the hands never see the open sky.',
    uneasy: 'The yard pays by the hour now; the Ark crew are free and have no country.',
    breaker: 'The climber cars run down full, and a colony lights a lamp back.',
  },
  // numbers: FIRST PASS, for Palamedes review
  numbers: {
    // dates (Caleb's ruling 2026-10-20: year 6000, Founding ~3000)
    contractOfPharosYear: 3200, arkStartYear: 5940, arkStrategoiCount: 12,
    // A
    reckoningTruceCost: 300,
    // C: breaking point
    buryUnrest: 10, ignoreUnrest: 15, rumourDelay: 2 /* director cycles */, sealCost: 250, sealUnrest: 10,
    arkPilots: 4, arkTroops: 4 /* squads */, openSkyUnrest: 5, ignoreHireStanding: 5,
    melitePrice: 100, sellLedger: 150, ignoreGarrison: 2, fuseUnrest: 20, fuseGarrison: 2,
    leakStanding: 10, leakUnrest: 10, arkGuardFighters: 4, arkGuardDestroyers: 2, yardDarkIncome: 20 /* % */,
    // D: held and broken
    chainIncome: 15 /* % */, yardCycle: 6, chainUnrest: 5, chainGarrison: 3 /* squads */, purityStanding: 10,
    brokenIncome: 25 /* % */, brokenCycles: 3, recrewCost: 400, handPilots: 3, helotTrust: 10,
    bondedFees: 10, heirStanding: 5, arkTroopBays: 6 /* squads */,
    // E: rival
    cadetYears: 4, rivalKillXp: 200, rivalKillCredits: 120, rivalDeadUnrest: 10, ransom: 360, turnPilots: 4,
    // F: Katabasis
    homeMetropolis: 2, homeHarriers: 2, homePathfinders: 4, homeSparrows: 12, nationsBreak: 2, gateEmitters: 6,
    rideSeconds: 60, cutSeconds: 25, cutIncome: 40 /* % */, tetherCost: 1500, cutUnrest: 15,
    holdSeconds: 120, holdFireSeconds: 15, evacTroops: 2, evacStanding: 15, emitterRepair: 90,
    // G: event deck
    lampStanding: 5, lampCost: 50, lampSnub: 5, seatShipsCost: 200, seatCruisers: 2, seatFighters: 4,
    seatHuntXp: 80, seatGarrison: 1, seatIgnore: 5, rejoinStanding: 15, rejoinIncome: 10 /* % */,
    rejoinUnrest: 10, rejoinSnub: 10, relayFighters: 4, relayStanding: 5, relayTapCost: 150,
    handsUnrest: 30, handsCost: 120, handsIncome: 10 /* % */, handsBuyout: 300, loyalStanding: 20,
    marsPromise: 10, originalsCalm: 10, originalsSale: 500, originalsUnrest: 20, originalsStanding: 10,
    originalsMoved: 5, openSkyCalm: 15, openSkyRefused: 5,
  },
};
```
