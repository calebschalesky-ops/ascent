# Feuds: the overarching story (DRAFT, 2026-10-20)

Caleb's ruling, 2026-10-20: "You're going to have to conquer the galaxy. Other houses won't let you just take over.
You'll be able to ally with other houses, but there will be certain houses that are always hostile to other houses.
We just need to build in in-game feuds and lore, and then gameplay should be able to flow from that."

This replaces the voting / seat-of-power idea, which Caleb rejected. There is no fixed plot. The story is the state of
seven houses that hate, fear, hire and court each other, and it keeps moving whether the player acts or not. It is
built on `LORE.md` ("A short history", "Who stands where" and each house's crisis hooks). Nothing below contradicts it.

## 1. The one win

**Hold all seven capitals.** Every house, allies included, has to fall in the end. Alliances are tools, not endings.

Assumption, for Caleb to overrule: an ally that is conquered last can **submit** (become your vassal world) instead
of being fought, if your standing with it is high enough. A vassal counts as held. That lets diplomacy pay off at the
end without becoming a way to win by talking.

## 2. Standing between houses

Every pair of houses has a standing on one scale. The AI houses use it toward each other, and toward the player's
house:

| Standing | What it means in play |
|---|---|
| **Blood feud** | Always at war. Can never ally, never truce. Raids each other on a timer. |
| **Hostile** | At war. A truce can be bought for a while, and it decays. |
| **Wary** | No war. Patrols shadow you; a shot fired drops it to Hostile. |
| **Friendly** | Trade, docking rights, will join a war against a shared enemy. |
| **Allied** | Shared targets, wingmen sent to you, open stations, joint attacks. |

Standing moves from what happens: attacks, captures, trade, broken treaties, events (section 5). **Blood feuds never
move.**

## 3. The feuds (from "Who stands where")

**Blood feuds: always hostile, for every start**

| Pair | Why, in the lore |
|---|---|
| **Mars ⚔ Jupiter** | A republic against kings, Rome against Macedon. Their war over the belt is **already being fought when the game starts**. |
| **Mars ⚔ Earth** | The Secession: Mars left the Metropolis by war and calls Earth the decayed empire. |
| **Moon ⚔ Venus** | The Nika Burning: the Selenitai ran the Blues the night the Hippodrome burned. |

**Claim feuds: Hostile at the start, and they come back**
A truce here can be bought, but it decays back to Hostile:
- **Jupiter → Saturn:** the "cousins" who think Titan belongs to them.
- **Mars → Saturn:** Mars's terraforming needs the ice of Saturn's rings, and Saturn says no.
- **Venus → Jupiter:** gaudy rivals, two crowns that each think they're the real one.

**Everyone else starts at Wary or Friendly**, read off the table. Earth holds the Moon close. Venus courts Earth as
the heir. Mercury hires to everybody.

**Two houses with special rules**
- **Mercury, the mercenaries:** never in a blood feud. Mercury's fleets can be **hired** by anyone, including your
  enemies, and a hired company can turn on you if someone outbids you. It is the one house that plays everyone.
- **The Moon, the sanctuary:** it barely fights for itself. Attacking it calls a **Sacred War**: every house that is
  Friendly or better with the Moon declares on the attacker. Taking the Moon is the hardest diplomatic problem in the
  game, not the hardest military one.

## 4. What this gives each start

| You play | Blood enemy | Natural ally | The fight that finds you first |
|---|---|---|---|
| Earth | Mars | Moon | Martian raiders, within the first minute |
| Moon | Venus | Earth | Nephelan raiders; the Sacred War rule protects you |
| Mercury | none | anyone who pays | contracts on every side; the hard mode |
| Venus | Moon | Earth (it courts the heir) | Selenite-paid raiders; Jupiter rivalry |
| Mars | Earth and Jupiter | Mercury, hired | a war on two fronts from the start |
| Jupiter | Mars | none safe | the belt war, already burning |
| Saturn | none, but everyone wants your ice | none | Jupiter and Mars both press Titan |

## 5. How the story comes at you

A **director** (the motivation plan's, in `src/lib/motivation/`, wired in for real) deals events from what the feuds
and standings say. These are not missions in order. The player answers them or doesn't, and the world moves either
way.

- **Your blood enemy raids you on a clock.** The first raid is two fighters, inside 60 s of your first undock, and it
  can be won. Later raids get bigger as both sides grow.
- **AI houses fight their own feuds.** The Mars–Jupiter war moves the belt frontier without you. A house that loses
  a war weakens, and that is your opening.
- **The strongest gets ganged up on.** When you hold 3 worlds, your Wary neighbours drift toward Hostile. At 5, the
  houses you haven't beaten form a **coalition** that attacks Earth (or your home world) together. That is the
  climax, and it comes from the feuds, not from a script.
- **Allies want things.** An ally asks you to join its blood feud, or it cools. Refusing has a cost.
- **Every house has its own crisis cards**, already written in LORE.md. Each one fires as an event that shifts
  standings or opens a target. Examples:
  - Earth: a League member votes to leave and takes its share of the navy.
  - Venus: the Autokrator dies without an heir, three cities each crown one, and the house splits in a civil war
    that you can exploit.
  - Mars: a popular general wins the belt war and marches on the Senate.
  - Jupiter: a marriage between the two royal houses is arranged, and Mars wants the wedding stopped.
  - Saturn: Jupiter offers Titan protection.
  - Mercury: one of the kings is caught selling power to Jupiter in secret.
  - Moon: a nation stops paying for its treasury, and the vault is opened.
- **A rival commander** from your blood enemy keeps escaping you and turning up again. He gives a war with a whole
  house a face.

## 6. What has to be built (for the threads)

1. **Standings table:** a 7×7 table with the starting values from section 3, the five levels, and the rules for how
   each one moves. A pure, tested module.
2. **Enemy AI reads standings:** Hostile and Blood-feud fleets engage on sight. Wary fleets shadow you. Friendly and
   Allied fleets don't fire, and allies fly with you. Today `enemyAI` treats every house as `hostile` and waits to be
   provoked.
3. **The director, wired in:** raids by blood enemy, AI-vs-AI wars on the feud pairs, the 3-world drift and the 5-world
   coalition, the crisis-card deck.
4. **Diplomacy screen:** see every house's standing toward you and toward each other. Buy a truce, hire Mercury, ask an
   ally for ships, accept a submission.
5. **The win:** all seven capitals held or submitted. Today conquest has no end state.

## Open for Caleb

1. Can a conquered ally submit and count as held, or must every capital be taken by force? (Assumed: it can submit.)
2. Are the three blood feuds the right ones? Earth–Mars makes a Mars start a two-front war from the opening minute.
