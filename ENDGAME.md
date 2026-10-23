# The endgame (DRAFT, 2026-10-20)

Sits on top of [FEUDS.md](FEUDS.md). The win is still the one Caleb ruled: **hold all seven capitals**. This file is
the lore and the beats that get the player there. The themes are borrowed from Red Rising (castes under the ruling
houses, an orbital drop assault, the closest ally's betrayal, a rising from below). **The names are not borrowed.**
Every term here is historical Greek, Roman or Byzantine, or comes from `LORE.md`.

Everything is written to be data: each house gets one record (section 2), and every beat is keyed to two numbers,
**worlds held** and **worlds broken** (section 1). New content means a new row, not new code.

---

## 1. The two numbers that drive everything

- **Worlds held:** capitals you hold, 0–7. That's the clock.
- **Chains or broken:** a choice for each world you take. You either keep its underclass in chains or break them.
  The count of broken worlds decides how the houses treat you and which ending you get.

**Default (for Caleb to overrule): you choose on every world, and your house sets the price.** Mars and Saturn
already preach citizenship, so breaking chains costs them little. Jupiter's kings and Venus's court run on it, so
breaking chains costs their player loyalty at home: a court revolt event and lost home income for a while.

---

## 2. The lore: the low castes

The Editing (LORE.md, "A short history") was never one edit. Each colony edited its ruling families for command and
its workers for the work. Every house stands on a caste it built, and every house has a polite word for it.
**"Helots"** is Mercury's word, and it has become everyone's slang.

Earth never edited anyone, so Earth calls itself the only free people. That's Earth's pitch as a liberator, and it
is half a lie.

Each row is one record. The **breaking point** is a crisis hook already written in LORE.md, which is now that caste's
moment.

| House | The caste (their word) | Edited for | The work | Breaking point (LORE hook) | Held in chains | Broken |
|---|---|---|---|---|---|---|
| **Earth** | *Contract hands* | nothing: hired, not made | Earth hires Mercury's helots and the Moon's bonded | "The Ark being built at Lagrange Yard is for a colony no one has announced." **The reveal: the Ark is Earth's first edited caste, built in secret.** | Earth's purity stays a story, and the yard keeps building | The Ark crews walk off. Earth loses the secret, and every helot in the system trusts an Earth player more |
| **Moon** | *Hierodouloi* (the temple's servants) | long bones, low-gravity lungs | Keep the vaults and copy the archive; held by debt to the treasuries | "A nation stops paying for its treasury; the Amphictyony votes on opening the vault." | The treasuries stay shut, and you collect the interest | **The vaults open.** A one-off credit windfall, and every house whose treasury is opened turns Hostile |
| **Mercury** | *Helots* | heat and radiation | Lay rail ahead of Lakedaimon so the city stays in the twilight | "A section of the rails breaks ahead of Lakedaimon; there are 300 hours to fix it before the dawn arrives." | The city keeps moving | **The rail stops.** Lakedaimon has 300 hours before the dawn burns it, and you choose: rebuild the rail with free hands, or let it burn |
| **Venus** | *Paroikoi* (the dependants) | live in the lifting envelopes, breathe thin air | Keep the cloud cities aloft | "A Nephelan city is losing lift and asks Earth, not Mercury, for help." | The cities float | One city sinks unless rebuilt. The envelope-born become the best pilots in the system, and you get their wing |
| **Mars** | *Proletarii* (the headcount) | low-light eyes, cold blood | Mine the ice under Arsia Mons; the Senate counts them but doesn't let them vote | "A popular general wins the belt war and marches on the Senate." **He raised his legions from the miners.** | The Senate stands, and the miners pay for it | The general's legions come over to you. Mars's own pitch, citizenship for all, comes back to bite it |
| **Jupiter** | *Laoi* (the folk) | radiation-hardened | Work the mines on Io, in the worst radiation of any moon | "A prisoner escapes from Io claiming to be the founding governor's lost heir." | Both crowns hold | **The false heir leads Io out.** A third crown, which splits Jupiter at the worst moment |
| **Saturn** | *Metics* (the outsiders) | the cold and the dark | Work the methane and the ice; free, but with no vote in the Ekklesia | "A Titan-born child is found to have an Earth birth record." | The assembly stays small and wary | The Ekklesia doubles overnight, and the ice opens to you |

Adding a house later means adding one row.

---

## 3. The beats, by worlds held

### Worlds 1–2: the feud war
FEUDS.md runs this: blood enemies, raids, alliances, Mercury hired by everyone. The helots are just scenery so far.
Each conquered world shows its caste on the world panel, so the player sees the choice coming.

### World 3: the Reckoning
- Wary houses drift toward Hostile (FEUDS.md).
- **The rival appears** (section 4). He raids your newest world, and he gets away.
- The first **chains or broken** prompt appears on the world you just took. Your first two worlds get it
  retroactively.

### World 4: the Stirring
- Every world held in chains rolls an **unrest** event. Its caste's breaking point fires early unless the world is
  garrisoned.
- Every broken world sends you something: troops, pilots, a ship or credits (the Broken column).
- The houses respond to how many worlds you've broken:

| Broken count | How the surviving houses read you |
|---|---|
| 0 | A conqueror, like them. They fear you, but you could deal with them. |
| 1–2 | A threat to the order. Prices to buy a truce double. |
| 3+ | **The end of the order.** Surviving houses can't make a truce with you, but every caste in their worlds rises when you arrive. |

### World 5: the Last Alliance
- Every house you haven't beaten sets its feuds aside and moves on your home world together. Blood feuds still
  apply between the AI houses, so a Mars–Jupiter alliance against you is fragile, and it can break if you hit the
  right one.
- **The betrayal.** Your ally with the highest standing makes a choice. Unless your standing is at its maximum, or
  you hold its capital in chains as a hostage, it betrays you: it opens your home station's defences to the
  alliance ("the gates open"). A loyal ally names its price instead: one of your worlds, or its own blood enemy
  wiped out.
- The rival leads the alliance fleet.

### World 6: the Katabasis (the drop)
The last capital, whichever one it is. It's a set piece in four stages, built only from systems the game already has:
1. **Break the home fleet.** Its capital ship and destroyers, in the space around the planet.
2. **Crack the armour.** The god-armour megastructure in low orbit (god-armour thread): guns, shield sections.
3. **The drop.** Infantry carriers and drill boarders go down through the atmosphere (atmosphere thread). It's the
   rival's last stand.
4. **Take the palace.** The infantry hold the capital site against the counterattack for a set time.

Every capital puts its own twist on stage 3 or 4:

| Last capital | The twist |
|---|---|
| **Quito Skyport** (Earth) | The space elevator. You can ride the tether down, or cut it and take the city with no way to orbit. |
| **Pytho** (Moon) | A Sacred War is called the moment you fire. You drop into the crater walls of Copernicus. |
| **Lakedaimon** (Mercury) | The city is moving. You have to land on rails running into the dawn, before the heat arrives. |
| **Nephelokokkygia** (Venus) | You drop into the clouds. Cut the lifting envelope and the city falls with the palace in it. |
| **Urbs Arsia** (Mars) | Lava tubes. Drill boarders go through the rock, because the skylights are guarded. |
| **Kallistopolis** (Jupiter) | Under the ice domes of the Valhalla crater. Break a dome and the crater opens to vacuum. |
| **Astu** (Saturn) | The shore of Kraken Mare. The methane sea is the only open approach. |

### World 7: the ending
The ending depends on how many of the seven worlds you broke:

| Broken | Ending | In a sentence |
|---|---|---|
| 0–2 | **The Sovereign** | You're the top of the same order, with more chains than ever and nobody left to fight. |
| 3–4 | **The Uneasy Crown** | You hold the system, half of it free and half of it waiting to be. |
| 5–7 | **The Breaker** | The houses are gone, the castes with them, and the system has to work out what comes next. |

Each house adds one line to the ending ("Lakedaimon still runs west; nobody is made to lay its rail"), taken from
its row in section 2.

---

## 4. The rival

- **Who he is:** the top graduate of your blood enemy's officer school.
  - Mars: the *Campus Martius*.
  - Jupiter: the *Royal Pages*, the Macedonian school for the sons of companions.
  - Every other house: one line in its record.
  - Mercury has no blood enemy, so its rival comes from whichever house first puts a contract out on you.
- **When he appears:**
  - World 3: raids your newest world, then escapes.
  - World 5: leads the Last Alliance.
  - World 6: defends the last capital in the drop.
- **How it ends, at the drop:** kill him, capture him (drill boarder on his flagship), or **turn him**. You can turn
  him only if you broke the chains on his home world. He was raised by the same caste, and he joins you for the
  ending.
- He's a name and a portrait (the race-art pipeline), plus a short set of lines for each appearance. He grows the
  story without new systems.

---

## 5. Losing

- **The Last Alliance takes your home world:** you're not dead. You go into **exile** at your strongest remaining
  world, with your fleet and your bay, and you have to take your home back. The rival holds it.
- **You hold no world:** game over. The ending is the rival's.
- Dying in a fight keeps the cost from the death rule (FEUDS thread).

---

## 6. For the build threads

- **One record per house:** `{ caste, edited, work, breakingPoint, held, broken, rivalSchool, lastCapitalTwist,
  epilogueLine }`. A pure data file, tested to make sure every house has every field.
- **Beats keyed to (worlds held, broken count).** The director deals them; it's the same director FEUDS.md wires in.
- **The Katabasis** is four existing systems run in order on one target (conquest, god-armour, atmosphere, infantry
  and boarding). It's integration work, not a new system.
- **New UI:** the chains-or-broken prompt on taking a capital, the caste line on the world panel, and the ending
  screen.

## Open for Caleb

1. Chains or broken: chosen on every world with a price set by your house (the default above), or locked by your
   starting house?
2. Is the rival always a he, or rolled per game?
3. Does exile feel right for losing your home world, or should losing it end the game?
