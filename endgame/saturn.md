# Saturn: the Autochthones (endgame section)

> DRAFT, 2026-10-20. Follows `endgame/CONTRACT.md`. Sources: LORE.md (integration-3), FEUDS.md, ENDGAME.md,
> GOD-ARMOUR.md. Calendar by Caleb's ruling of 2026-10-20: the game's year is 6000 and the Founding was around year
> 3000. That overrides LORE.md's "three hundred years". Every number is FIRST PASS and lives in section I.

## A. The house at the endgame

By the late game Saturn is the house everyone needs and nobody owns. Its fleet is small and far away: one Trireme, a
destroyer, two Paralos raiders and four Glaux gliders, plus the Holkas tankers that every other fleet in the system
waits on. It has no blood enemy. It has two houses with claims on it: Jupiter, the "cousins" who think Titan is theirs,
and Mars, whose Greening needs the ice of Saturn's rings.

Its fear is the old one, Earth's reach, and a newer one: losing the vote. Every big choice goes to the Ekklesia, and
most pass by a handful. What Saturn wants from the war is to be left alone and paid for its fuel.

**At the Reckoning (3 worlds).** The Ekklesia debates you in public. If you are Wary, a vote to sell you no more fuel
comes up within a few minutes and passes by one vote. Saturn does not raid; it starves you.

**In the Last Alliance (5).** Saturn joins by a recorded vote, and the alliance runs on its fuel. Its Holkas tankers
sit behind the alliance line. Kill them and the alliance's cruisers go home early.

**As your ally at the betrayal.** Saturn is the only house that votes on betraying you, out loud, where you can watch.
You get one card (SAT-G6) to argue the case before the lot falls. If you lose, the citizen the lot picked opens your
gates by hand.

## B. The caste: the Metics

**Where the edit came from.** Titan was settled last, around year 3500. The citizens' edit (big dark eyes, fat, dense
body hair, light enough to fly) came with the first children. The Metics came later, in the 4300s, when the fuel
trade grew faster than the citizen families could work it. Workers arrived from Earth, Mars and Jupiter on contract.
In 4371 the Ekklesia voted, by six votes, that anyone who stayed on Titan past one Titan year had to take the work
edit, and that the edit gave a right to stay and nothing else. A council of five hundred, drawn by lot, wrote the
terms. Nobody elected the people who decided it, and nobody can be blamed for it. That is how Titan likes it.

**What the edit does to the body.** Heavier than a citizen: denser bone and thick muscle for hauling in the rings'
near-zero g and on the shore at 0.14 g. Blood that holds heat. Eyes as large as a citizen's. Too heavy to fly. A Metic
cannot strap on wings and cannot fly to the Pnyx. They walk up the hill and stand at the back.

**A day of work.** Wake on a rig on Ligeia Mare, in orange haze, with the methane rain ticking on the roof. Six hours
in a heated suit, walking the pump lines, clearing ethane ice from the intakes by hand. Ride a Holkas out to Stoa
Station. Cut ring ice into blocks, load the skimmers, ride back. Pay the *metoikion*, the Metic tax, at the docks.
Sleep in a hall with forty others. Every few days, carry a citizen's wings up a jumping tower for them.

**What they call themselves.** "Metics" (*metoikoi*, "those who live with us") is the citizens' polite word. Among
themselves they are the *Enchorioi*, "the locals". It is a joke at the citizens' expense: most Metics have been on
Titan longer than the families who claim they sprang from it.

**A saying of their own.** "You fly to the vote. We carry the wings."

**What they want.** Their names on the deme rolls, so the lot can fall on them. A Metic needs a citizen sponsor, a
*prostates*, to sign a lease, sue or marry. They want that gone.

**Two leaders.**
- **Lysimache of the Stoa Docks.** Runs the ice crews at Stoa Station, eleven hundred hands. *Want:* her crews
  enrolled as citizens, all of them at once, before anyone can pick them off one at a time. *Lie:* she tells the
  Ekklesia her crews will never stop the skimmers. She has already set the day they stop.
- **Dexippos Vane, rig-master at Ligeia.** Speaks for the fuel rigs and drinks with citizens. *Want:* to be the first
  Metic the lot ever falls on. *Lie:* he says he speaks for every rig. He has a deal with his prostates: citizenship
  for him alone, if the rigs stay quiet.

## C. The breaking point: the birth record

The LORE hook: "A Titan-born child is found to have an Earth birth record." Titan stopped answering Earth around year
4100, but an old charter routine in the birth clinics was never switched off. For nineteen hundred years every birth
on Titan has gone to Earth's relays. The first file anyone reads is a girl on the citizen roll whose mother came in
as a Metic. By the citizen law, she is a Metic too.

It plays two ways. **Held:** you are in the chair, and SAT-C1 fires. **Attacking:** you buy the file and light the
fuse with SAT-C1x. Either way, SAT-C2 follows.

### SAT-C1: The Second File
- Trigger: you hold Saturn in chains and worlds held ≥ 4; or worlds held = 3 and unrest(saturn) ≥ the early-fire
  threshold and Saturn is ungarrisoned
- Read-aloud: A clerk on Bema Station pulls a nine-year-old's file and finds a second one, sent to Earth the day she
  was born. Her mother came to Titan as a Metic. The girl is on the citizen roll. The Ekklesia wants your ruling.
- Choices:
  1. Call the assembly: card(SAT-C2)
  2. Seal the file and pay the clerk: credits(-60), flag(sat_record_sealed), card(SAT-C2) after a delay
  3. Ignore it: unrest(saturn, +20), card(SAT-C2)

### SAT-C1x: A File for Sale
- Trigger: you are Hostile with Saturn, worlds held ≥ 3, and you do not hold Saturn
- Read-aloud: A Hemerodrome courier docks beside you with a copy of a birth file from Earth's relays. A Titan citizen,
  nine years old, born to a Metic mother. The courier names a price and waits, helmet off.
- Choices:
  1. Buy it and send it to the Pnyx: credits(-80), unrest(saturn, +25), card(SAT-C2)
  2. Buy it and send it to the Stoa docks: credits(-80), unrest(saturn, +35), standing(saturn, -15), flag(sat_fuse_lit), card(SAT-C2)
  3. Send the courier away: standing(mercury, -5)

### SAT-C2: The Vote on the Roll
- Trigger: SAT-C1 or SAT-C1x
- Read-aloud: Eleven thousand citizens fly to the Pnyx. Forty thousand Metics stand on the shore below with no wings
  and no vote. One question: strike the girl from the roll, or open the roll to every Metic on Titan.
- Choices (held; when attacking, the AI Ekklesia picks 1, or 2 if unrest(saturn) ≥ the self-break threshold):
  1. Strike her from the roll: chainWorld(saturn), unrest(saturn, +20), card(SAT-C3a)
  2. Open the roll: breakWorld(saturn), card(SAT-C3b)
  3. Let the lot decide: lot(SAT-C3a, SAT-C3b)

### SAT-C3a: The Rigs Go Quiet
- Trigger: SAT-C2 choice 1, or the lot draws it
- Read-aloud: The pumps on Ligeia Mare stop at noon. Lysimache's skimmers sit at Stoa Station, loaded and unmoving.
  Dexippos Vane sends word that he can restart his rigs, for a price only you can pay.
- Choices:
  1. Land troops on the rigs: garrison(saturn, +2), troops(-40), unrest(saturn, +10)
  2. Pay Vane's price: credits(-120), income(saturn, -10%), flag(sat_vane_bought)
  3. Ignore it: income(saturn, -40%), unrest(saturn, +15), standing(mars, -10)

### SAT-C3b: The Ekklesia Doubles
- Trigger: SAT-C2 choice 2, or the lot draws it; when attacking, Saturn broke itself after you lit the fuse
- Read-aloud: The Pnyx cannot hold them, so the assembly meets on the shore of Kraken Mare. Fifty thousand hands go up.
  The first vote opens the ring ice to you. The second sends a Holkas to your dock.
- Choices:
  1. Sell the ring ice to Mars: standing(mars, +20), credits(+150), standing(jupiter, -15)
  2. Keep the ice for your own yards: ships(holkas, +2), income(saturn, +15%)
  3. Ignore it: unrest(saturn, +10), standing(saturn, -10)

## D. Held and broken

**Held in chains.** Fuel income from the Ligeia Rigs, the best base income of any capital at 6000 prices (see I).
Unrest rises each beat while the Metics have no vote. Saturn needs a light garrison, because nobody on Titan fights
in the street, but it needs one on each of the rigs and on Stoa Station, which is three places, far apart. The
assembly stays small and wary, and it votes against you whenever it can.

**Broken.** The Ekklesia doubles overnight and the ice opens to you. You get:
- Ring ice: a lump of credits once, then a standing offer to sell to Mars (SAT-C3b).
- Troops: Metic hands who volunteer, heavy and slow and hard to knock down.
- Two **Holkas** tankers that fly in your fleet and refuel it. *Look:* a round-bellied black merchant hull with amber
  running lights, painted on the bow with a Metic's own mark, a hand, where a citizen ship carries the owl-eye.
- A low garrison need, because the new citizens police their own rigs.

**What it costs with the other houses.** Jupiter is angry: it wanted Titan's citizens weak and grateful. Mars is
pleased if you sell it the ice, and Mars's own miners notice. Earth gains, because the file proves Titan came from Earth
after all, and Earth's League calls it a homecoming. For a Saturn player, breaking costs little: the house already
preaches the vote for every citizen, and the Metics prove it (ENDGAME.md, section 1). Chains or broken is chosen on
every world and the starting house sets the price (default, open).

## E. Saturn's officer school and the rival

**The school: the Ephebeia at the Prytaneion.** Saturn's rival is not drawn from a blood enemy, because it has none.
This is the school its officers come from, and the rival you meet if Saturn is the house that stands against you. Every
citizen at eighteen serves two years as an *ephebe* at the Prytaneion off Enceladus, by the geysers where Titan takes its
water. Year one is flight: Glaux gliders through Titan's haze, then wings alone off the towers of Astu. Year two is the
ring patrol in Paralos raiders, three months out and back on one load of fuel. Command goes by lot each day, the way
the ten generals command. The top ephebe of each year is the only one the Ekklesia ever elects young.

**The rival.** Rolled each game from: Kallias, Myrto, Thrasyllos, Eirene (default, open). The title is **the
Strategos**. *Look:* very tall and light, wing-harness worn over the flight suit even in a cockpit, a fur collar, and
the owl-eye painted over one eye only. *Flagship:* the Trireme ***Salaminia***, named for Athens's other state ship.

**What they want, and the lie.** The Strategos wants Titan left alone and will burn the whole outer system to get it.
The lie they tell themselves is that they sprang from Titan and owe nothing to anyone off it. The Strategos was raised
in a Metic hall by a nurse from the Stoa docks, and carries her hands' mark on the inside of the harness.

**Scene lines.** No gendered pronouns, ever; the title or they/them.
- *World 3, the raid:* "You took a world that didn't vote for you." / "We'll be back when it asks us to." / The
  Salaminia's engines go out of sight in under a minute.
- *World 5, leading the alliance:* "The Ekklesia voted for this by forty-one hands. I'm one of them." / "Every ship in
  this line burns Titan's fuel. Think about that."
- *World 6, the last stand:* "The sea is open. That's the one way we left you." / "Come and stand on the shore, then."

**How it ends.**
- *Kill:* the Salaminia breaks up over Kraken Mare. standing(saturn, -20), xp(+300), unrest(saturn, +15)
- *Capture:* a drill boarder takes the bridge and the Strategos takes off the wings. credits(+200), flag(sat_strategos_held), standing(jupiter, +10)
- *Turn (Saturn must be broken):* the Strategos shows you the hand on the harness and comes over. rivalScene(sat_turn), pilots(+4), ships(trireme, +1), standing(saturn, +25)

## F. The Katabasis at Astu

1. **The fleet.** Off Titan: the Trireme *Salaminia*, one destroyer, two Paralos raiders, four Glaux gliders, and two
   Holkas tankers that refuel the line. While a tanker lives, every Saturn ship recovers fuel and keeps raiding at long
   range. Kill the tankers first and the Paralos turn for home.
2. **The armour.** The Harpe of Kronos girdles Saturn itself, a belt at 1.068–1.08 R under the rings, with sickle
   blades curving toward both poles (GOD-ARMOUR.md). Astu is on Titan, far outside it. What has to be broken is the
   belt's treasury section, the *aerarium*, where Saturn's fuel money and its hangars sit, and the two blade sections
   whose shield emitters cover the hangars. With those down, nothing launches to reinforce Titan.
3. **The drop.** Titan's air is thick and cold, and the land approach to Astu is covered by guns on the jumping towers
   and the hills behind them. The methane sea is the only open approach. Infantry carriers come down onto Kraken Mare
   itself, skim the surface in the haze and land on the shore under the Pnyx. The Strategos flies Glaux down into the
   haze after them. Every carrier lost on the sea is lost with its troops.
4. **The palace.** There is no palace. There is the Pnyx, a bare hill with a speaker's platform. Holding Astu means
   holding the *bema* until the assembly can no longer meet. The counterattack is citizens on wings, coming off the
   towers in waves.

**The choice in the middle.** On the descent, a voice on the open band offers a way across the sea.
- Take the Metic pilots' route: carriers lost on the sea halved; only if Saturn is broken, or you promise to break it
  (flag(sat_promise), and breaking a promise costs standing(saturn, -30) after the win).
- Blow the oxygen stores on the shore: the shore burns where the oxygen meets the methane, the tower guns go quiet,
  and Astu is held faster. unrest(saturn, +40), standing for every house -10.
- Go straight in under the tower guns.

**The way to fail.** Lose more than half the carriers on the sea, or lose the bema before the hold timer runs out. The
fleet falls back to Titan orbit, and the armour's treasury section repairs if you leave the system.

## G. The event deck

### SAT-G1: One Vote
- Trigger: worlds held 1–2; you are not Saturn; standing(saturn) ≤ Wary
- Read-aloud: The Ekklesia votes on selling you fuel. You hear it live, an hour late. The count is read out from the
  Pnyx. You lose by one hand.
- Choices:
  1. Buy fuel from a Jovian broker: credits(-50), standing(jupiter, +5)
  2. Send an envoy to argue it again: standing(saturn, +10), credits(-20)
  3. Ignore it: income(home, -10%)

### SAT-G2: The Lot Falls on a Newcomer
- Trigger: worlds held 2–3; you are Saturn, or Allied with Saturn
- Read-aloud: Jupiter offers Titan protection: a Callisto fleet at Bema Station, for good. The assembly debates.
  The kleroterion drops a white ball. The citizen who must argue the case arrived on Titan four years ago.
- Choices:
  1. Back the newcomer, who argues no: standing(jupiter, -15), standing(saturn, +10)
  2. Back the protection: standing(jupiter, +15), unrest(saturn, +15), flag(sat_jovian_guard)
  3. Ignore it: standing(saturn, -5), card(SAT-G2b)

### SAT-G3: The Mock King
- Trigger: worlds held 3; you hold Saturn in chains
- Read-aloud: Saturnalia. Masters serve their servants, and the lot picks a mock king for the day. It picks a Metic.
  Lysimache, in a paper crown, asks you a question in front of everyone.
- Choices:
  1. Answer her in the open: unrest(saturn, -10), standing(jupiter, -5)
  2. Cancel the festival: unrest(saturn, +25)
  3. Ignore it: unrest(saturn, +10), card(SAT-C1)

### SAT-G4: Skimmers at Stoa
- Trigger: worlds held 3–4; Mars is not beaten; you hold Saturn or are Allied with it
- Read-aloud: Grey Martian wedges sit at the end of Stoa Station's docks. Their skimmers are cutting ring ice without
  asking. A consul's voice says the Greening cannot wait for an assembly.
- Choices:
  1. Drive them off: spawnRaid(mars, 2, 1, 0, 0), standing(mars, -10)
  2. Sell them the ice: credits(+90), standing(mars, +15), standing(saturn, -10)
  3. Ignore it: income(saturn, -15%)

### SAT-G5: The Ostraka
- Trigger: worlds held 4; you hold Saturn, broken
- Read-aloud: The new citizens vote for the first time. Shards of ice-pot pile up on the shore, each scratched with a
  name. Yours is your governor's. Ten years out of Titan, by law.
- Choices:
  1. Accept the vote: garrison(saturn, -1), unrest(saturn, -15)
  2. Keep the governor: unrest(saturn, +30), standing(saturn, -15)

### SAT-G6: The Vote to Betray
- Trigger: worlds held 5; Saturn is your ally with the highest standing
- Read-aloud: The Ekklesia debates opening your gates to the alliance. They let your envoy speak. Below the Pnyx the
  kleroterion is loaded, ready to pick the citizen who will do it if the vote goes against you.
- Choices:
  1. Promise them the ring ice forever: standing(saturn, +20), standing(mars, -20)
  2. Give them one of your worlds: loseWorld(chosen), standing(saturn, +30)
  3. Ignore it: flag(sat_betrays)

### SAT-G7: The Geysers
- Trigger: worlds held 6; you are attacking Saturn
- Read-aloud: The Prytaneion sits over the geysers of Enceladus. Every drop of water on Titan comes up through it. A
  Paralos captain hails you and offers to shut the valves for a fee.
- Choices:
  1. Pay to shut them: credits(-100), garrison(saturn, -2), unrest(saturn, +20)
  2. Take the Prytaneion by force: spawnRaid(saturn, 4, 1, 0, 0), xp(+80)
  3. Ignore it: standing(saturn, -5)

### SAT-G8: Ten Generals
- Trigger: worlds held 7; you hold Saturn
- Read-aloud: Titan's ten generals still command a day each. Today's general, picked by turn, asks whether there is
  still an Ekklesia, or only you.
- Choices:
  1. Let the Ekklesia sit: unrest(saturn, -20), income(saturn, -10%)
  2. Close the Pnyx: unrest(saturn, +30), flag(sat_pnyx_closed)

## H. Endings

**The Sovereign.** The Pnyx is a museum and the kleroterion sits in a glass case. The Metics still pay the metoikion,
now to you. Titan's fuel still goes everywhere, and nobody on Titan votes on where.

**The Uneasy Crown.** The Ekklesia meets, and half the shore can vote. The other half carries the wings up the towers
and waits for the lot to reach it.

**The Breaker.** The Ekklesia meets on the shore of Kraken Mare because no hill on Titan is big enough. The lot falls on
whoever it falls on. Nobody asks where anyone was born.

## I. The record

```ts
{
  caste: 'Metics',
  edited: 'the cold and the dark: dense bone, heat-holding blood, large eyes; too heavy to fly',
  work: 'the methane rigs on Ligeia Mare and the ring ice at Stoa Station; free, with no vote in the Ekklesia',
  breakingPoint: 'A Titan-born child is found to have an Earth birth record.',
  held: 'The assembly stays small and wary.',
  broken: 'The Ekklesia doubles overnight, and the ice opens to you.',
  rivalSchool: 'The Ephebeia at the Prytaneion, off Enceladus',
  rivalNames: ['Kallias', 'Myrto', 'Thrasyllos', 'Eirene'],
  lastCapitalTwist: 'Astu, on the shore of Kraken Mare: the methane sea is the only open approach.',
  epilogue: {
    sovereign: 'The Metics still pay the metoikion, now to you.',
    uneasy: 'Half the shore can vote; the other half carries the wings.',
    breaker: 'The Ekklesia meets on the shore, and nobody asks where anyone was born.',
  },
  numbers: { // numbers: FIRST PASS, for Palamedes review
    years: { founding: 3000, titanSettled: 3500, stoppedAnswering: 4100, meticEdit: 4371, now: 6000 },
    population: { citizens: 11000, metics: 40000, stoaCrews: 1100 },
    fleet: { trireme: 1, destroyer: 1, paralos: 2, glaux: 4, holkas: 2 },
    held: { incomePerBeat: 140, unrestPerBeat: 5, garrisonSites: 3, garrisonPerSite: 1 },
    broken: { iceWindfall: 150, troops: 60, holkas: 2, garrisonSites: 1, incomeBonusPct: 15 },
    breakPrice: { saturnStart: 'low', standingJupiter: -15, standingEarth: 10, standingMars: 0 },
    breakingPoint: { earlyFireUnrest: 40, selfBreakUnrest: 50, sealDelaySec: 180 },
    reckoning: { fuelVoteAfterSec: 180, fuelVoteMargin: 1 },
    katabasis: { tankerRefuelPerSec: 2, carriersDropped: 8, maxCarrierLossPct: 50,
      meticRouteLossMult: 0.5, holdTimerSec: 240, wingWaves: 4, oxygenFireUnrest: 40,
      oxygenFireStandingAll: -10, brokenPromiseStanding: -30, treasuryRepairOnLeave: true },
    rival: { killXp: 300, killStanding: -20, captureCredits: 200, turnPilots: 4 },
    ostracismYears: 10,
    cardEffects: 'FIRST PASS: every number inside an effect in sections C, E and G',
  },
}
```

## New effects needed

- `lot(cardA, cardB)`: queues one of two follow-up cards at random, 50/50. Used by SAT-C2 choice 3.
- `ships(holkas, n)` and `ships(trireme, n)` assume `ships()` takes a race-only or capital class id, not only a role.
- `income(home, ±n%)` assumes `home` resolves to the player's home world.
