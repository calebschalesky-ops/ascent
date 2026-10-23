# The Moon: the Selenitai at the endgame

> Part of the endgame expansion. Follows `CONTRACT.md`. DRAFT, 2026-10-20. **Numbers: FIRST PASS, for Palamedes
> review.** Every one is listed in section I. Sources: LORE.md, FEUDS.md, ENDGAME.md, GOD-ARMOUR.md, DESTROYER.md (the
> *Theoris*). The game year is 6000; the Founding was around 3000 (Caleb, 2026-10-20). Card variables in braces
> (`{defaulter}`, `{bloodEnemy}`, `{rivalHouse}`) are filled by the director when the card is dealt.

## A. The house at the endgame

By the late game the Moon has the smallest navy that still counts: one Thesauros, one Theoris destroyer, two Lampas
cruisers and four Belone interceptors, all kept within reach of Pytho. It does not raid. It pays others to. Every
house's money sleeps in the Treasuries under Copernicus, and the College of the Pythia has sold an answer to every side
of this war, so the Selenitai know more about your fleet than you do.

Its fear is the one in LORE.md: being made to choose. A player at three worlds is the first power in three thousand
years that might force the choice.

What it wants from the war is an end where the record is whole and the vaults are shut. It does not much care who
wins, as long as the winner still pays rent on a vault.

- **At the Reckoning (3 worlds).** It drifts like any Wary house, and it acts through price. The College raises your
  answer fee and starts selling your fleet movements to whoever asks.
- **In the Last Alliance (5).** It sends its Theoris and a few Belones, no more. Its real share is money: a line of
  credit from the Treasuries to the alliance, spent on Mercury companies. If you have ever fired on the Moon, the
  Amphictyony has already called its Sacred War, and the alliance flies under that banner.
- **As your ally, when the betrayal comes.** The Moon betrays with a document. The archive holds the founding charter
  of every station in the system, yours included, with its first defence codes. The Pythia sells them and the gates
  open. A loyal Moon names its price: Nephelokokkygia taken, or your oath that no vault under Pytho is ever opened.
- **If you are the Moon and lose Pytho,** you go into exile at your strongest world (default, open). The rival holds
  the Hall of Answers, and the Sacred War no longer protects you.

## B. The caste: the Hierodouloi

**Where the edit came from.** The Treasuries were dug under Copernicus around the year 3400, when every nation was
moving its gold and its records off Earth. The vaults were sealed in thin, cold, dry air so paper and film would keep
and nothing could burn. Ordinary Selenites fainted in them within the hour. The College proposed an edit for the
children who would keep the vaults. The Amphictyony voted for it and paid for it, every seat, which is why every house
shares the blame and none admits it. The first edited children were born to families who still owed for their passage
up from Earth. The Amphictyony bought that debt, and the children inherited it along with their lungs.

**What the edit does.** Longer bones than any other Selenite, built to reach the top of racks cut for columns that
could never stand on Earth. A deep chest and slow breath, made for vault air as thin as a mountain top. The cost is
that a Hierodoulos cannot leave the Moon. In anything heavier their lungs fail. The law that exiles a forger to Earth
is a death sentence for them, and everyone knows it.

**A day of work.**
- At the first hour, ring the bell-frames that keep Earth's 24-hour day through two weeks of dark.
- Walk a vault by hand-lamp and count what is in it against the ledger. Every vault is built in its owner's style, so
  a keeper of the Venus vault works under gold mosaic and a keeper of the Mars vault under bare concrete arches.
- Copy the archive in the copy-hall, in the old hand. Every record is copied twice: one copy stays at Pytho, one goes
  to the Quiet Ear on the far side.
- At the last hour, stand for the ledger reading, where each keeper hears what they still owe. The number goes up.

**Their own word.** The polite word is *Hierodouloi*, the temple's servants. Among themselves they are the
*Hektemoroi*, the sixth-parters, after the Athenian debtors before Solon who paid a sixth of their harvest and never
got clear. A sixth of each keeper's wage goes on the debt.

**Their saying.** "The Earth never moves, and nor does the debt."

**What they want.** The *Seisachtheia*, the shaking-off of burdens that Solon gave Athens: the ledgers burned, not the
vaults robbed. After that, the right to sit the College's examination, which no one in debt may sit.

**Two leaders.**
- **Archippe of the Thirteenth Vault**, senior keeper of the Venus treasury. *Wants:* to read her grandmother's line
  in the ledger, which the College says was lost. *Lie:* she tells the College she would never open a vault. She has
  copied the key-ring of every vault she has walked.
- **Dion the Copyist**, master of the copy-hall. *Wants:* to sit the examination and wear the silver laurel. *Lie:* he
  tells the keepers he will burn the ledgers the day he can. He has been altering them, one line a night, for years,
  and a fire would destroy the only proof of the families he has quietly freed.

## C. The breaking point: the vault opens

The LORE.md hook: "A nation stops paying for its treasury; the Amphictyony votes on opening the vault." **If you hold
the Moon** you sit in the chair and the vote is yours. **If you are attacking it,** you can light the fuse, and this
chain is how an attacker takes apart the Sacred War before firing a shot.

### moon-bp-1: The Unpaid Vault
- Trigger: worlds held ≥ 2 and the Moon not broken; or World 4 (the Stirring) with the Moon held in chains and
  garrison(moon) below the need. `{defaulter}` is the house with the lowest credits.
- Read-aloud: A treasury under Pytho has gone a year unpaid. Its owner, {defaulter}, says the war ate the money. The
  Hierodouloi who keep that vault have stopped work. They say a vault nobody pays for has no claim on their debt.
- Choices:
  1. Pay the arrears yourself (you hold the Moon): credits(-250), standing({defaulter}, +10), unrest(moon, -10)
  2. Put it to the Amphictyony: card(moon-bp-2)
  3. Pay the keepers to stay out (you are attacking): credits(-150), flag(moon-fuse-lit), card(moon-bp-2)

### moon-bp-2: The Vote on the Vault
- Trigger: queued by moon-bp-1.
- Read-aloud: The Amphictyony sits in the Hall of Answers, one seat for each nation, under the fixed Earth. Along the
  walls stand the keepers who hold the keys. Their own debts are written in ledgers kept inside those vaults.
- Choices:
  1. Keep it shut: standing({defaulter}, +5), unrest(moon, +15), flag(moon-vault-shut)
  2. Open the one vault: credits(+250), standingAtMost({defaulter}, -40), card(moon-bp-3)
  3. Give the keys to the keepers (you hold it, or moon-fuse-lit): flag(moon-keys-given), card(moon-bp-3)

### moon-bp-3: The Vaults Open
- Trigger: queued by moon-bp-2.
- Read-aloud: The doors swing back one after another along the crater wall. The Hierodouloi carry out the ledgers first
  and burn them in the Hall of Answers, under the open roof. The money they leave where it lies.
- Choices:
  1. Take the money (you hold it): breakWorld(moon), credits(+1500), standingAtMost(every treasury owner, -40)
  2. Close what you can (you hold it): chainWorld(moon), credits(+300), unrest(moon, +30), garrison(moon, +2)
  3. Let the Moon answer for it (you are attacking): standingBetween(every treasury owner, moon, -40),
     flag(amphictyony-broken), standing(moon, -20)

With `amphictyony-broken` set, no Sacred War can be called while the flag stands. The owners blame the Moon for their
money. That is the diplomatic road to Pytho that FEUDS.md asks for.

## D. Held and broken

**Held in chains.**
- Income: the Moon's own plus the treasury interest, income(moon, +25%).
- Garrison: 2 at Pytho. Below that, moon-bp-1 can fire at the Stirring.
- Unrest: +5 on the Moon for each other world you break, because every keeper hears about it.
- If you are the Moon, chains keep the Sacred War rule working for you.
- With the other houses: nothing changes. Their money is safe, so they think you are safe.

**Broken.**
- A one-off windfall of 1500 credits, then income(moon, -40%), because nobody pays rent on an open vault.
- pilots(+4): the long-boned keepers fly the Belone better than anyone, since its cockpit was drawn for a Selenite.
- troops(+3): vault wardens who know every tunnel under Copernicus.
- The archive opens: flag(archive-open) shows every house's standing toward every other house on the diplomacy screen.
- A unique ship, the **Seisachtheia**, a Thesauros refit. *Look:* every vault door cut away, so the colonnade stands
  open, and Lampas mirror batteries sit in the silver bays where the money was.
- The cost: every house whose treasury opened is Hostile at best. Earth takes it personally, standing(earth, -15). The
  Amphictyony dissolves, so no Sacred War can protect the Moon again, for anyone.

**What breaking costs a Moon player** (default, open): the College walks out of the Hall, income(moon, -30%) for 600
seconds, and you lose Sacred War protection for good. Breaking any other world costs a Moon player income(moon, -10%)
as depositors pull their money, and standing -5 with that world's former owner.

## E. The rival school and the rival

**The school: the Phylakterion.** The guard-house of the Amphictyony, on Tholos Station in lunar orbit, among the
white columns. The Moon barely fights for itself, so its school does not train a navy. It trains officers to command
other people's. Cadets come from every member nation, and Selenites earn a place by the same examination the College
sets. Each cadet learns to fly all seven cruisers, rides escort on the Theoros, and spends a year reading treaty law
in the archive. The final test is to command a mixed fleet of borrowed ships through a sham Sacred War without being
the one who fires first. Graduates take the old title *Hieromnemon*, "sacred remembrancer", and ride with the Sacred
War fleets to tell foreign captains where to go.

**The rival.** The Phylakterion's top graduate. A Venus player meets them first, since the Moon is Venus's blood enemy.
- *Rolled names* (default, open): Aristarchos, Phemonoe, Theano, Kallikles. Lines use "the Hieromnemon" or they/them.
- *Look:* tall even for a Selenite, Hierodoulos-born. A silver-leaf laurel, a white robe with the keeper's grey stripe
  still sewn at the hem, and a frame harness worn under thrust.
- *Flagship:* the Thesauros **Kastalia**, named for the spring at Delphi. Its vault bays carry the banners of every
  Amphictyony nation, and it flies whichever ones are at war that day.
- *Wants:* the Amphictyony promised the top graduate that their mother's debt would be struck off when the war ends.
- *The lie they tell themselves:* that guarding the sanctuary is neutral. It is guarding the vaults, and their mother
  is in one.

**World 3: the raid.** The Hieromnemon leads a hired Mercury company, paid from the Treasuries.
- "This company was hired with your own money. Your treasury is still under Pytho, and we spend its interest."
- "I never fire first. They do. I only tell them where you are."
- (escaping) "Write it down. The Moon will."

**World 5: leading the Last Alliance.**
- "Every seat, one banner. Even Mars and Jupiter fly in the same line tonight."
- "The Sacred War doesn't need me to win. It needs you to keep firing."
- "Your gates were in our archive before your grandparents were born."

**World 6: the last stand at Pytho.**
- "The wall of Copernicus is nearly four kilometres high. I know every column in it."
- "Every fleet that owes this place is on its way. I only have to hold until they get here."
- "My mother copies the ledger that owns her. Burn it or don't. Just decide."

**How it ends.**
- **Kill:** the Kastalia breaks over the crater rim, and the Sacred War loses its officer. credits(+120), xp(+200),
  flag(rival-dead), standing(moon, -15)
- **Capture:** a drill boarder takes them on the vault deck, and the Amphictyony pays to keep the war running without
  them. flag(rival-captured), credits(+400)
- **Turn** (the Moon broken): they hold up the burned ledger page with their mother's name on it and turn the
  Kastalia's mirrors on the alliance. flag(rival-turned), ships(capital, +1), pilots(+2), standing(moon, +20)

## F. The Katabasis at Pytho

**The twist.** A Sacred War is called the moment you fire, unless `amphictyony-broken` is set. From your first shot,
every house Friendly or better with the Moon sends a contingent on a timer until the Hall falls or you fail.

**1. The fleet.** The house fleet at Pytho is one Thesauros (the Kastalia if the rival is here), one Theoris, two
Lampas and four Belone. On top of it, each Sacred War wave is spawnRaid(each house Friendly+ with the Moon, 2, 1, 0, 0)
every 90 seconds. The Moon's own ships hang back under the armour and fire Lampas mirrors from behind the piers. They
are waiting for help, and the help keeps coming.

**2. The armour: Selene's Veil.** A crescent of white plating over the Earthward face, its horns reaching round the
limb, with a colonnade of white piers along its outer edge. A thinner arched band, the veil, sweeps over the pole
with a wavy hem. Copernicus sits on the near side, so the crescent hangs right over Pytho. It is the thinnest armour of
the seven (GOD-ARMOUR.md), with the most open sky. What has to break: the shield emitters in the piers on both horns.
Take those two sections and the veil has nothing to hang from; it opens a lane straight down to the crater.

**3. The drop.** The Moon has no air, so there is no burn through the atmosphere. Infantry carriers make a powered
descent into the crater and land on the colonnade terraces cut into the wall, at different heights. Drill boarders go
in through the columns, toward the Hall of Answers. The rival's last stand is on the terraces above the Hall, and
Sacred War waves keep landing their own troops on the upper terraces while you climb.

**4. The palace: the Hall of Answers.** Hold the Hall, roof open to the Earth, for 180 seconds against the
counterattack. Holding it means you sit over the Treasuries, and the chains-or-broken prompt here is the vault itself:
moon-bp-3 fires as you take the Hall, if it has not fired already. The seats of the Amphictyony stand empty around you.

**The way to fail.** If the Sacred War waves land more troops on the terraces than you hold, or the timer for the
Hall runs out with the Hall contested, the drop fails. You lose the troops on the ground, the rival escapes, and every
Sacred War house gets standing(you, -10) for trying.

**The choice in the middle.**

### moon-kat-1: The Theoros Launches
- Trigger: stage 3 of the Katabasis at Pytho.
- Read-aloud: A small white ship lifts out of the crater with a laurel ring at its bow. The Pythia is aboard, with the
  master copies of the archive. Every nation swore to let it pass. The Pythia offers to call off the Sacred War if you do.
- Choices:
  1. Let it pass: flag(sacred-war-ended), flag(archive-lost), standing(every house, +5)
  2. Stop it: flag(oath-broken), flag(pythia-held), standing(every house, -15), sacredWarWaves(×2)

## G. The event deck

### moon-ev-01: The Leaked Answer
- Trigger: worlds held 1–2, the Moon not held, at war with `{bloodEnemy}`.
- Read-aloud: A Theoros docks beside you with a sealed answer from the Pythia. It is the answer your enemy paid for:
  where you strike next. The envoy says the College regrets the leak, and asks a fee to stop the next one.
- Choices:
  1. Pay the fee: credits(-100), standing(moon, +5)
  2. Ignore it: spawnRaid({bloodEnemy}, 4, 1, 0, 0)

### moon-ev-02: The Envoy's Passage
- Trigger: any worlds held, the Moon Wary or worse toward you.
- Read-aloud: The Theoros crosses your patrol line, carrying an answer to your enemy. It is unarmed. Its laurel ring
  catches your lights. Every nation swore to let it pass, including yours.
- Choices:
  1. Board it: credits(+150), flag(oath-broken), standing(moon, -20), standing(every house, -5)
  2. Let it pass: spawnRaid({bloodEnemy}, 2, 1, 0, 0)

### moon-ev-03: The Charter Clause
- Trigger: worlds held 2+, Earth Friendly or better, the Moon not held.
- Read-aloud: A Selenite archivist meets you at Tholos Station with one page. It is a founding charter clause that says
  the Moon still belongs to Earth. The archivist wants passage off the Moon and a price, and will sell to Earth if you
  won't.
- Choices:
  1. Buy it and give it to Earth: credits(-150), standing(earth, +15), standing(moon, -20)
  2. Buy it and burn it: credits(-150), standing(moon, +15)
  3. Ignore it: standingBetween(earth, moon, -20), standing(moon, -5)

### moon-ev-04: The Hours Go Unrung
- Trigger: World 4 (the Stirring), the Moon held in chains.
- Read-aloud: At the turn of the hour, no bell rings in Pytho. The keepers have stopped the clock that holds Earth's
  day through the long dark. The College calls it sacrilege. The keepers call it a strike.
- Choices:
  1. Send the garrison: garrison(moon, +2), troops(-2), unrest(moon, -10)
  2. Strike a sixth off every debt: income(moon, -15%), unrest(moon, -20)
  3. Ignore it: unrest(moon, +25), card(moon-bp-1)

### moon-ev-05: The Copyist's Ledger
- Trigger: worlds held 3+, the Moon held in chains.
- Read-aloud: A copyist is caught writing her own debt down by a third. The law says exile to Earth. For a keeper's
  lungs that is a death sentence. The College wants it done in public, under the open roof.
- Choices:
  1. Exile her: income(moon, +5%), unrest(moon, +15)
  2. Pardon her: unrest(moon, -10), income(moon, -10%), flag(forgery-pardoned)
  3. Let the keepers judge her: unrest(moon, -5), card(moon-bp-2)

### moon-ev-06: The Blues Ride Again
- Trigger: the Moon Friendly or better, Venus Hostile or worse toward you.
- Read-aloud: The Pythia asks you for money to back the Blue faction at Chrysopolis, Venus's second city. A race is
  set for the first time since the Nika Burning. The Moon would like the Blues to win, and to lose nothing doing it.
- Choices:
  1. Fund the Blues: credits(-200), standing(moon, +15), standing(venus, -15)
  2. Refuse: standing(moon, -10)

### moon-ev-07: The Amphictyony Sits
- Trigger: worlds held 5, the Moon not held and not beaten.
- Read-aloud: The Amphictyony meets to vote on the Moon's place in the alliance against you. Seven seats, and the
  Treasuries behind them. A seat-holder you have never met sends word that votes can be bought, as long as nobody
  writes it down.
- Choices:
  1. Buy the seats: credits(-300), flag(moon-abstains)
  2. Threaten the vaults: standing(moon, -15), flag(moon-fuse-lit)
  3. Ignore it: spawnRaid(mercury, 4, 2, 0, 0)

### moon-ev-08: The Quiet Ear
- Trigger: worlds held 6, the Moon broken.
- Read-aloud: The far-side telescopes have caught engine light moving behind the Sun. The keepers who run the Quiet Ear
  are free now, and they want paying before they read you the bearing. Under the College, they never asked.
- Choices:
  1. Pay them: credits(-100), flag(katabasis-intel)
  2. Take the dish by force: unrest(moon, +15), garrison(moon, -1), flag(katabasis-intel)
  3. Ignore it: spawnRaid({rivalHouse}, 4, 1, 1, 0)

## H. Endings

**The Sovereign.** The vaults under Copernicus stay shut, and now they are yours. Every house that is left pays rent
to you through the same ledgers. The bells still ring Earth's hours through the dark. The keepers still hear their
number at the last hour, and it still goes up.

**The Uneasy Crown.** Pytho is one of the worlds still waiting. The Treasuries are shut and full, and the keepers have
started counting the key-rings instead of the gold. Half the system has already burned its ledgers, and everyone in
the copy-hall knows it.

**The Breaker.** The ledgers burned in the Hall of Answers under the open roof. Nobody holds anybody's money on the
Moon any more, and the vaults stand open for anyone to walk through. The keepers still ring Earth's hours, because now
they choose to. Some of them are sitting the examination.

## I. The record

```ts
// numbers: FIRST PASS, for Palamedes review
{
  caste: 'Hierodouloi',                        // their own word: Hektemoroi, the sixth-parters
  edited: 'long bones; deep chest, slow breath for thin vault air; cannot leave the Moon',
  work: 'Keep the Treasuries and copy the archive; held by debt to the treasuries',
  breakingPoint: 'A nation stops paying for its treasury; the Amphictyony votes on opening the vault.',
  held: 'The Treasuries stay shut, and you collect the interest',
  broken: 'The vaults open: a one-off windfall, and every house whose treasury opened turns Hostile',
  rivalSchool: 'The Phylakterion, the Amphictyony guard-house on Tholos Station',
  rivalNames: ['Aristarchos', 'Phemonoe', 'Theano', 'Kallikles'],   // default, open
  rivalFlagship: 'Kastalia',
  uniqueShip: 'Seisachtheia',                  // Thesauros refit, broken only
  lastCapitalTwist: 'A Sacred War is called the moment you fire; drop onto the colonnade terraces of Copernicus',
  epilogue: {
    sovereign: 'The vaults stay shut and pay rent to you; the keepers still hear their number rise.',
    uneasy: 'The Treasuries are full and shut, and the keepers have started counting the key-rings.',
    breaker: 'The ledgers burned under the open roof; the keepers ring the hours because they choose to.',
  },
  numbers: {                                   // FIRST PASS, for Palamedes review
    casteEditedYear: 3400,                     // lore date, not a balance number
    fleet: { capitals: 1, destroyers: 1, cruisers: 2, fighters: 4 },
    held: { incomePct: 25, garrisonNeed: 2, unrestPerOtherWorldBroken: 5 },
    broken: { windfall: 1500, incomePct: -40, pilots: 4, troops: 3, uniqueShips: 1,
              ownerStandingCap: -40, earthStanding: -15 },
    moonPlayerBreakPrice: { homeIncomePct: -30, seconds: 600, perOtherWorldIncomePct: -10,
                            perOtherWorldOwnerStanding: -5 },                 // default, open
    sacredWar: { waveSeconds: 90, perHouse: { fighters: 2, cruisers: 1, destroyers: 0, capitals: 0 },
                 friendlyThreshold: 20, failedDropStanding: -10 },
    katabasis: { holdHallSeconds: 180 },
    rival: { killCredits: 120, killXp: 200, killMoonStanding: -15, captureRansom: 400,
             turnCapitals: 1, turnPilots: 2, turnMoonStanding: 20 },
    cards: {
      'moon-bp-1': { payCredits: -250, payStanding: 10, payUnrest: -10, fuseCredits: -150 },
      'moon-bp-2': { shutStanding: 5, shutUnrest: 15, openOneCredits: 250, openOneStandingCap: -40 },
      'moon-bp-3': { takeCredits: 1500, ownerStandingCap: -40, closeCredits: 300, closeUnrest: 30, closeGarrison: 2,
                     attackerOwnerToMoon: -40, attackerMoonStanding: -20 },
      'moon-kat-1': { passStanding: 5, stopStanding: -15, stopWaveMultiplier: 2 },
      'moon-ev-01': { feeCredits: -100, feeStanding: 5, raid: [4, 1, 0, 0] },
      'moon-ev-02': { boardCredits: 150, boardMoonStanding: -20, boardAllStanding: -5, raid: [2, 1, 0, 0] },
      'moon-ev-03': { buyCredits: -150, earthStanding: 15, moonStanding: -20, burnMoonStanding: 15,
                      ignoreEarthToMoon: -20, ignoreMoonStanding: -5 },
      'moon-ev-04': { garrison: 2, troops: -2, garrisonUnrest: -10, debtIncomePct: -15, debtUnrest: -20,
                      ignoreUnrest: 25 },
      'moon-ev-05': { exileIncomePct: 5, exileUnrest: 15, pardonUnrest: -10, pardonIncomePct: -10, judgeUnrest: -5 },
      'moon-ev-06': { fundCredits: -200, moonStanding: 15, venusStanding: -15, refuseStanding: -10 },
      'moon-ev-07': { buyCredits: -300, threatenStanding: -15, raid: [4, 2, 0, 0] },
      'moon-ev-08': { payCredits: -100, forceUnrest: 15, forceGarrison: -1, raid: [4, 1, 1, 0] },
    },
  },
}
```

## New effects needed

- `standingAtMost(house, n)`: lowers your standing with a house to n if it is above n. "Turns Hostile" is a cap, not
  a step.
- `standingBetween(a, b, ±n)`: moves the standing between two AI houses. The attacker's fuse in section C works on the
  owners' standing with the Moon, not with you.
- `sacredWar(attacker)`: every house Friendly or better (≥ 20) with the Moon declares on the attacker and starts the
  wave timer in section F. Blocked while `amphictyony-broken` or `sacred-war-ended` is set. If `00-system.md` defines
  this rule, its version wins.
- `sacredWarWaves(×n)`: multiplies the Sacred War wave size, for moon-kat-1.
