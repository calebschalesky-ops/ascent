# Research: Motivation and Progression for Ascent Flight

Compiled 2026-10-19. This feeds the motivation/progression plan for Ascent Flight: a single-player, local, no-monetisation three.js space conquest game. The player flies a ship through a solar system whose planets are held by Greek and Roman offshoots of humanity. Progress comes from expansion, battle, conquest, mining and an economy. There is no storyline, and the player picks the order.

## How to read this document

**Source rule.** Every source cited here was opened this session (2026-10-19) with WebFetch, or read as a WebSearch result page. Sources I saw only as search-result summaries, without the page itself loading, are marked **[search only]**. Treat them as weaker than an opened page. The full list is at the end, with a separate "Not opened" list.

**Evidence labels.**

- **MEASURED**: a peer-reviewed experiment, survey study or meta-analysis, read at abstract level or better.
- **STATED**: a developer or author says it about their own work (dev diary, GDC slides, interview quote, patch notes, patent text).
- **WEAK**: a pop account, a review, a fan wiki, a secondary summary or an anecdote.

Where a source is about rats, pigeons or monkeys, I say so. Animal results are MEASURED for the animals and only suggestive for players.

---

## Part A: Psychology

### A1. Self-determination theory: autonomy, competence, relatedness

**What the sources say.**

- Ryan & Deci (2000) set out three innate needs, **competence, autonomy and relatedness**. When these needs are satisfied, motivation and well-being go up; when they are thwarted, both drop [S1]. **MEASURED** (as a review of a research programme).
- Two findings from the same review matter directly for a progression system. **MEASURED**, via the meta-analysis the review cites (Deci, Koestner & Ryan 1999):
  - "All expected tangible rewards made contingent on task performance do reliably undermine intrinsic motivation."
  - "Threats, deadlines, directives, pressured evaluations, and imposed goals" also diminish intrinsic motivation, because they make the person feel controlled from outside.
  - By contrast, "optimal challenges, effectance-promoting feedback, and freedom from demeaning evaluations" facilitate intrinsic motivation [S1].
- Ryan, Rigby & Przybylski (2006), "The motivational pull of video games," ran four studies with the **PENS** instrument (Player Experience of Need Satisfaction). PENS has subscales for in-game autonomy, in-game competence, relatedness, presence and intuitive controls [S2]. **MEASURED**.
  - **Study 1** (n = 89, Super Mario 64): competence and autonomy related to enjoyment and preference for future play. Intuitive controls worked through competence.
  - **Study 2** (n ≈ 49, Zelda: Ocarina of Time vs A Bug's Life): the better-rated game scored higher on enjoyment (M 4.56 vs 3.60) and on preference for future play. Within Zelda, autonomy and competence mediated the effect of controls on motivation.
  - **Study 4** (n = 730 online MMO players): autonomy, competence and relatedness each **independently** predicted enjoyment and future play. The SDT relatedness measure correlated r = .66 with Yee's "social" motive.

**Implications for Ascent Flight.** No storyline and a player-chosen order give us autonomy almost for free. The risk is losing it again through soft railroading, where one order is so much better that the choice is fake. Competence feedback has to be clear and immediate (see A4, Flow). Relatedness is the weak need in a single-player game. The closest we can get is NPC factions that remember and respond to the player (A9, B6), which is where RimWorld-style storytelling and faction memory come in.

**The tension we must design around.** Ryan & Deci list **deadlines** and **imposed goals** among the things that undermine intrinsic motivation [S1]. Part B recommends an external escalating clock for the mid-game slump. That clock has to read as a *threat in the fiction* that the player can push back with their own choices (the XCOM 2 pattern, B3). It must never read as a real-world deadline or a chore.

### A2. Reward prediction error and dopamine; "wanting" is not "liking"

**What the sources say.**

- Schultz, Dayan & Montague (1997) report on primate dopamine neurons (monkeys) [S3]. **MEASURED** (animal electrophysiology plus a computational model).
  - The neurons fire a positive signal when a reward is **better than predicted**, show **no change when it arrives exactly as predicted**, and are **depressed below baseline** at the moment a predicted reward fails to arrive.
  - After learning, the burst moves away from the reward itself to the **earliest reliable cue** that predicts it.
  - In the authors' words, the neurons "are activated only if the time of the reward is uncertain."
- Berridge & Robinson (1998) depleted dopamine in rats' nucleus accumbens and neostriatum "by up to 99%" [S4]. **MEASURED** (rats).
  - The rats still showed normal hedonic "liking" reactions to sweet versus bitter tastes, normal learning of new likes and dislikes, and normal pharmacological enhancement of palatability.
  - The authors conclude that dopamine is needed for **"wanting" incentives, but not for "liking" them**. Its role is *incentive salience*, the motivational pull of reward cues.

**Correcting the pop account.** "Dopamine = pleasure" is wrong on the primary evidence. Dopamine tracks surprise about reward and lends motivational pull to cues. A design that maximises dopamine-style anticipation can produce wanting without liking: the player keeps clicking and enjoys it less. That is exactly the pattern we do not want.

**Implications.**

- A fully predictable payout stops being a *surprise* signal. Its pleasure comes back only through the player valuing the thing itself.
- Each fight or mining run should therefore pay a **visible fixed floor** (so missing out never feels like omission, which the neurons register as a negative signal) plus a **variable component** that can come in better than expected.
- The anticipation moves to the earliest cue: the scanner ping, the enemy loadout readout, the ore-vein glint. Those cues are worth investing in as audio-visual moments.

### A3. Reinforcement schedules (Ferster & Skinner) and their limits

**What the sources say.**

- I could not open Ferster & Skinner (1957) itself. The pop account I opened says a variable-ratio schedule yields high, steady response rates, is "the most resistant schedule to extinction of all four," and is commonly tied to slot machines [S5]. **WEAK**.
  - The same page adds its own caveat: most schedule effects were established "with rats and pigeons in controlled chambers." In people, language, self-awareness and rules can override the contingencies [S5].
- Laskowski (2022, PhD thesis, Lethbridge) trained rats on random-ratio versus fixed-ratio food schedules [S6]. **MEASURED** (rats, thesis-level).
  - Random-ratio rats were "highly motivated" but showed **no other signs of addiction**.
  - Addiction-like symptoms appeared only when the dopamine agonist pramipexole was added.
  - A 2019 *Journal of Gambling Studies* paper from the same line of work reportedly found random-ratio schedules "motivating but not addictive" [search only; not opened].

**Where pop accounts overstate.** The claim that "variable-ratio rewards are what make games addictive" carries a pigeon-chamber result straight into a context with goals, narrative, choice and stop cues. The rat evidence I opened says random-ratio schedules raise response rate and persistence, which is motivating. It does not show that the schedule alone creates compulsion.

**Implications.** Variable reward is a legitimate tool for a fight payout. A **pure** variable-ratio loop with no floor, no goal and no natural stop point is the exploitative version. We avoid that version; see Part C.

### A4. Flow and challenge-skill balance

**What the sources say.**

- Csikszentmihalyi & LeFevre (1989) tracked 78 adult workers for a week with the experience sampling method [S7]. **MEASURED**.
  - They defined flow as "a condition of high challenges and skills."
  - Most quality-of-experience measures followed flow more closely than they followed work versus leisure.
  - Most flow happened at work.
- Jenova Chen (2007), "Flow in games," *Communications of the ACM* [S8]. **STATED** (designer viewpoint built on Csikszentmihalyi).
  - The flow zone lies between **anxiety** (challenge above ability) and **boredom** (challenge below ability).
  - Players tolerate "a temporary lack of stimulation — assuming we are given hope that more is on the way."
  - Different players have different flow zones, so a single "narrow, static experience" fails novices and experts alike.
  - The fix is to "offer adaptive choices" and to "embed choices inside the core activities," so that adjusting difficulty never interrupts play. His surfing example: the surfer picks which wave to take.

**Implications.**

- Let the player pick their challenge **through the core activity**, not through a settings menu. Visible threat ratings on planets and fleets let the player choose which world to attack, which is choosing their flow zone. This fits our no-fixed-order structure.
- Quiet stretches (travel, mining) are tolerable **if the player can see more coming**. Hold that thought for the director pattern in B5.

### A5. The goal-gradient effect

**What the sources say.**

- Hull's 1932 prediction, as quoted by Kivetz et al., was that animals in a maze "will move at a progressively more rapid pace as the goal is approached." In Hull's 1934 runway composite, 11 blind rats, about 160 measurements per point, ran faster in each section nearer the food [S9]. **MEASURED** (rats; read through Kivetz et al.'s reproduction of the figure).
  - I also opened Hull's 1934 habit-family hierarchy paper. It uses goal-gradient values for the *strength* of a tendency rather than for running speed [S10].
- Kivetz, Urminsky & Zheng (2006), *Journal of Marketing Research* [S9]. **MEASURED** (field data and field experiments).
  - **Café card.** "Buy 10 coffees, get 1 free," 949 redeemed cards. Inter-purchase times fell by about **20% (0.7 days)** from the first stamp to the last.
  - **Illusory progress.** A **12-stamp card with 2 pre-filled "bonus" stamps** (still 10 real purchases) was completed in **12.7 days**, against **15.6 days** for a plain 10-stamp card. That is nearly three days, or about **20% faster**. Process tests ruled out a sunk-cost explanation.
  - **Post-reward resetting.** After redeeming, members slowed down again on the next card: the first inter-purchase times on the new card were 3.1 and 2.7 days, against 2.2 and 2.1 days at the end of the first.
  - **Generalisation.** The effect held for effort as well as purchases: members rating songs online (51 songs to earn a reward) visited more often and rated more per visit as they neared the threshold.
  - **Retention.** Customers who accelerated more toward their first reward were more likely to be retained and re-engaged sooner.

**Implications.**

- Show a progress bar to the next rung, always.
- Start each new rung **partly filled**: the illusory head start works and is honest, because the requirement is shown in full.
- Expect a slump straight after each payoff (post-reward resetting). Have the next goal already visible and partly filled **before** the current one completes.

### A6. Loss aversion

**What the source says.** Kahneman & Tversky (1979), *Econometrica* [S11]. **MEASURED** (choice experiments, abstract-level read).

- The value function is concave for gains, convex for losses, and **steeper for losses than for gains**.
- The **certainty effect**: outcomes that are merely probable are underweighted against certain ones.
- The **isolation effect**: components shared by all options get ignored, so framing changes choices.
- Low probabilities are *overweighted*, which they suggest helps explain the appeal of both insurance and gambling.

**Implications.**

- Losing a ship or a planet hurts more than winning one pleases. Use that for **stakes inside the game**, as EVE does (B7), but scale it so a loss is a setback and never the end of a campaign.
- **Do not use loss aversion to punish stopping**: nothing decays while the game is closed (Part C).
- Players overweight small chances, so a "1% legendary drop" feels likelier than it is. State real odds wherever there is randomness.

### A7. The Zeigarnik effect and its failed replication; the Ovsiankina effect

**What the sources say.**

- Ghibellini & Meier (2025), *Humanities and Social Sciences Communications*, meta-analysed both effects [S12]. **MEASURED**.
  - They found **no memory advantage for unfinished tasks** (Zeigarnik), but **a general tendency to resume interrupted tasks** (Ovsiankina).
  - Their conclusion: Ovsiankina "represents a general tendency, whereas the Zeigarnik effect lacks universal validity."
  - They suggest the original effect depended on situational factors, such as experimenter authority and task involvement, that were more common historically.
- Secondary summaries give a recall ratio near 0.99 and a resumption rate around 67%. I could not confirm either number against the paper [search only]. Do not quote them.

**Where pop accounts overstate.** "Unfinished tasks nag at you, so leave a quest open to bring players back" is the pop version of Zeigarnik. The meta-analysis says the memory claim does not hold up. What holds is milder: people tend to *go back to* interrupted tasks.

**Implications.** A save that drops the player back next to a half-built station, with the next step shown, uses the honest Ovsiankina tendency. We should not manufacture "open loops" designed to nag between sessions.

### A8. Novelty, mastery and discovery

**What the source says.** Bunzeck & Düzel (2006), *Neuron* [S13]. **MEASURED** (human fMRI, two studies).

- The human substantia nigra/VTA, the midbrain dopamine region, responded to **stimulus novelty itself**. It did not respond to rarity, negative emotional content, or a familiar item being a task target.
- The response coded **absolute** novelty, unlike the adaptive, relative coding reported for reward in animals.
- Novelty also **enhanced learning** of familiar items presented in the same context.

**Implications.** Genuinely new things (a new planet type, a new enemy behaviour, a new faction's architecture) carry motivational weight that a re-skin does not. Novelty in a context also helps the player learn what is around it. So a new mechanic is a good moment to teach.

### A9. Player-type data: the Quantic Foundry / Yee model

**What the sources say.**

- Quantic Foundry's reference sheet lists **12 motivations in 6 clusters**, built by factor analysis on more than 1.25 million respondents [S14]. **MEASURED** (large self-selected survey; not a probability sample).

  | Cluster | Motivations |
  |---|---|
  | Action | Destruction, Excitement |
  | Social | Competition, Community |
  | Mastery | Challenge, Strategy |
  | Achievement | Completion, Power |
  | Immersion | Fantasy, Story |
  | Creativity | Design, Discovery |

  - **Mastery–Achievement** is the cluster QF calls "TALL": "coolheaded, long-term gaming," seeking "gradual and cumulative mechanics, watching cities/farms grow over time."
  - **Strategy** is defined as "Thinking Ahead. Making Decisions."
  - **Power** is "Powerful Character. Powerful Equipment."
- Two further QF blog posts returned 403 when fetched [search only]:
  - **May 2024:** across about 1.5 million gamers, the average Strategy score fell from the 50th to the **33rd percentile** between 2015 and April 2024, the largest drop of the 12 motivations.
  - **2016:** in 4X, players seeking scientific or cultural victory averaged 28 years old, against 25 for military or economic victory.
- Ryan et al. (2006) compared SDT with Yee's earlier achievement / social / immersion factors, n = 730 [S2]. **MEASURED**.

**Implications.**

- Our core audience is likely Mastery–Achievement: strategy, power, completion.
- If the QF strategy trend holds, we should not assume players want deep spreadsheet planning. They want **legible decisions** with visible consequences (Meier, B1). Power growth should be felt in the cockpit, not just in a stat table.
- Completion players want a visible checklist of the system: planets held, factions met, ship parts found.

---

## Part B: Games

### B1. Civilization: interesting decisions, "one more turn," late-game tedium

- **Sid Meier, via Soren Johnson (2009).** Johnson was lead designer of Civ IV and wrote a *Game Developer* column summarising Meier's lessons [S15]. **STATED**.
  - "A good game is a series of interesting choices." Johnson adds that choices only matter when players **understand their consequences**.
  - "Double it or cut it by half": make big tuning changes, not small ones. Civ's early slowness was fixed by halving the map.
  - "The player should have the fun, not the designer or the computer." Civ IV cut a government feature because it ran hidden from the player.
- **Meier's GDC 2012 "Interesting Decisions" talk** exists as a video. The *Game Developer* page I opened only links to it [S16]; I did not watch it.
- **Game length.** Johnson told PCGamesN about Civilization: "a lot of people just never finish. It's just too long." He also said, "We really wanted to make a game that people actually finish." His Old World caps games at 200 turns [S17]. **STATED**.
- **Civilization VII (Ed Beach, Firaxis).** The *Ages* dev diary is the most direct developer statement of the 4X late-game problem I found [S18]. **STATED**.
  - "Late-game Civilization is just not that fun to play."
  - On snowballing: an empire can get so far ahead that "your choices and decisions have little effect on the ultimate outcome."
  - On micromanagement: it becomes "tedious to the player and makes every decision feel less important."
  - "More than half of the Civilization VI players have never finished a single campaign!"
  - **The fix.** The game is split into three Ages, each with *Legacy Path* milestones in science, military, culture and economy. *Crises* "add a jolt of variety and excitement to the end of the Age." Age transitions offer catch-up: "if you find yourself falling too far behind, an Age Transition will offer you a way to get back into the game."
  - Beach told PC Games Insider that at each break "we can simplify the game a little bit for you," cutting management the player is unlikely to keep up with [S19]. **STATED**.
- **"One more turn" mechanism.** I found no primary Meier explanation of the phrase; the search results were commentary only. The overlapping-goals explanation stays an unverified folk theory here. The goal-gradient evidence (A5) is the best measured stand-in for why staggered, nearly finished goals keep people going.

### B2. Stellaris: the mid-game hole and end-game crises

- **Dev Diary #33, "The Maiden Voyage," 16 May 2016,** by the game director after launch [S20]. **STATED**.
  - "One area I was not at all surprised to get flak for is the lack of mid-game scripted content." They had "neglected a whole category of events called 'colony events'."
  - Planned fixes: "Guarded 'treasures', mid-game crises, colony events."
- **Dev Diary #30, "Late Game Crises," April 2016** [search only; the Paradox forum blocked the fetch]. The purpose is to keep the game challenging past the point where players "tend to lose interest in most strategy games." Random occurrences "can upset your plans even at a very late stage." Risky technology is an example: the danger comes from *using* robot workers, not from researching them.
- **Current crisis mechanics,** from the community wiki, which is derived from game files [S21]. **WEAK**, but specific.
  - The game checks every **5 years** after the configured end-game year.
  - In the roll, "nothing happens" has weight **120**. Each of three end-game crises has weight **10**; Extradimensional Invaders has **8**. Weights rise with time.
  - Conditions are automatically met **50 years** past the end-game year.
  - At least **25 years** must pass between crises.
  - There are now named **mid-game** crises too (The Horde, The Gray Tempest, The Formless, The Voidworm Plague).

**Lesson.** Paradox found the hole in the middle first, then filled it with mid-game crises and treasures. Both crisis tiers are **probabilistic but escalating**: early checks mostly roll "nothing," and the chance grows until something is guaranteed.

### B3. XCOM 2: the Avatar Project as a clock

- **Game Informer, 10 Dec 2015 (Mike Futter)** [S22]. **STATED**.
  - Jake Solomon: "We wanted to eliminate the late-game grind."
  - On Pandemic as a model: "You're playing against the system."
  - The player can delay but not stop the end: "You can hold off the end for a little while, but you really can't hold it off that long."
- **Mechanics, from UFOpaedia** [S23]. **WEAK**.
  - A **12-block** bar fills as the aliens progress. Each alien facility contributes its own blocks, and destroying it removes them.
  - When all 12 are full, a countdown replaces the bar. Reducing progress by any amount stops it.
  - Story actions remove fixed amounts: Blacksite Vial 1, Forge Stasis Suit 2, Psionic Gate 2, Codex-to-Avatar 3, a War of the Chosen covert op 2.
  - The countdown lasts about 20 days on Veteran [search only, PC Gamer guide].

**Lesson.** The clock is in the fiction, it is visible, and **the player's own choices push it back**. That keeps it informational rather than controlling in SDT terms (A1). Its job is to kill the late-game grind.

### B4. Total War and Mount & Blade: conquest snowball and internal friction

- **Total War: Rome II, Patch 15 notes** (official wiki) [S24]. **STATED**.
  - "Civil wars no longer inevitable, instead they are now based on your level of support."
  - New effect bundles tied to Imperium level "increase political action cost and political incident occurrences."
  - "As the game goes on and you expand it will be harder and harder to avoid civil wars."
- **Mount & Blade II: Bannerlord, Development Update #6** (GameBanshee, Dec 2020) [S25]. **STATED** (via report).
  - Settlement loyalty falls with ruler/resident culture mismatch, recent capture, weak garrison and kingdom policy.
  - As loyalty falls, militia grows. When the militia judges itself stronger than the garrison, it rebels and a new clan takes the settlement.
- I found no Creative Assembly source on Attila's late game. That is a gap.

**Lesson.** Both games tax size: the bigger you are, the more internal friction you face. That is the anti-snowball pattern, the opposite of an external crisis. For us it means conquered Greek and Roman worlds should be able to **resist and revolt**, more likely when recently taken and culturally distant.

### B5. Left 4 Dead's AI Director: build-up, peak, relax

**Source.** Michael Booth, "The AI Systems of Left 4 Dead," Valve, AIIDE 2009. Valve's own PDF link returned 404; I read a hosted copy of the slides [S26]. **STATED**.

**Adaptive dramatic pacing.**

- Estimate each Survivor's emotional intensity and track the maximum across the team.
  - Intensity **rises** with damage taken, incapacitation, being pushed off ledges, and nearby infected dying (more for closer kills).
  - It **decays** toward zero over time, but not while infected are actively engaging that survivor.
- Four states:

  | State | What happens |
  |---|---|
  | Build Up | Full threat population until intensity crosses the peak threshold. |
  | Sustain Peak | Full population held for **3–5 seconds** after the peak. |
  | Peak Fade | Minimal population; wait for intensity to decay and for a natural break in combat. |
  | Relax | Minimal population for **30–45 seconds**, or until the team has travelled far enough toward the next safe room. Then Build Up again. |

- "Minimal" means no new mobs, no new specials, and no wanderers until the team is calm. Boss encounters ignore the pacing system.

**Two key principles.**

- The Director adjusts **pacing (how often peaks happen), not difficulty (how strong threats are)**.
- **Structured unpredictability**: content is neither uniform nor purely random. It is a superposition of designer-bounded random functions.

**Specific numbers worth stealing.**

- Mobs spawn at random **90–180 second** intervals on Normal, and about **75% come from behind**.
- Tank, Witch and "Nothing" are **shuffled and dealt** along the route, so the same boss event never repeats back to back. This is a deck, not a dice roll.

**Why replayability matters to Valve.** Static placement lets players memorise and converge on one optimal strategy. Procedural population keeps sessions a skill test.

### B6. RimWorld's storytellers (Tynan Sylvester, Ludeon)

- **The storytellers, per the RimWorld wiki** [S27]. **WEAK** (fan wiki; descriptions quote the game).
  - Cassandra Classic uses "a classic increasing curve of challenge and tension": push, give breathing room, push again.
  - Phoebe Chillax leaves long gaps.
  - Randy Random ignores pacing.
- **What drives events:** colony wealth, colonist count, recent deaths or injuries, and time since the last major event.
  - An *adaptation* score rises over time and drops when the colony suffers.
  - An optional wealth-independent mode uses a time curve instead, defaulting to **12 years to maximum threat** (range 1–20).
- Wikipedia, seen as a search result only, says the storyteller is modelled on L4D's AI Director [search only].
- Sylvester's GDC 2017 talk exists; I saw the listing only [search only].

**Lesson.** Threat scaled to **wealth** punishes hoarding and grows with the player. Threat scaled to **time** is a clock. RimWorld offers both. The adaptation score is a director-style breather after hard hits.

### B7. Space games: Homeworld, FTL, EVE, Sins, X4, Endless Space 2

- **Homeworld** (Wikipedia) [S28]. **WEAK**.
  - The fleet carries over between all 16 missions. Reviewers called it an innovation because ships stopped being disposable, and noted it made the game much harder because early losses compound.
  - The article also says mission difficulty "adjusts slightly" based on how many ships the player starts a level with. That is a quiet rubber band against snowballing in both directions.
- **FTL** (Wikipedia, citing developer statements) [S29]. **WEAK**, citing STATED.
  - 8 sectors of about 20 beacons. Each jump costs fuel and **advances the rebel fleet**, which captures beacons behind the player. That is a spatial clock that stops dawdling.
  - The developers aimed for a "suicide mission" feel, tuned around an expected **10% win rate**, and framed each loss as a lesson in which fights to take.
  - The GDC 2013 postmortem page I opened says the design was organised around a *feeling* (captaining a starship) rather than a genre [S30]. **STATED**.
- **EVE Online** (GamesBeat, 2020) [S31]. **STATED**.
  - CCP's CEO Hilmar Pétursson: "It's often this element of a devastating loss that becomes a turning point for people in Eve Online."
  - **No retention numbers** were given. Claims that "players who lose a ship early stay longer" are not supported by what I opened.
- **Sins of a Solar Empire** (Wikipedia) [S32]. **WEAK**.
  - Optional pirate raids are driven by anonymous player bounties and **grow stronger over time**. Players stop them by destroying pirate bases.
  - Reviewers criticised long sessions: games with six or more players can take four hours or more.
- **X4: Foundations.** Only forum and search material, which said the Xenon threat had weakened in recent versions [search only]. No usable developer source; treat as a gap.
- **Endless Space 2: quests.** Amplitude's developer post "Community GDD 9 Update – Narration," 5 Oct 2016 [S33]. **STATED**.
  - Quests come in three trigger types: **forced** (major faction chapters, longer and harder, bigger rewards), **random** (exploration) and **reactive** (triggered by player actions such as population loss or meeting an empire).
  - The major faction quest is "about four chapters," and its choices "reflect the faction's playstyle or push players toward other approaches."
  - Harder objectives unlock unique technologies or system effects.
  - A PC Gamer piece, seen in search only, quotes the developers: "We definitely shouldn't take over the imagination of the player… because then it wouldn't be 4X anymore."

**Lesson for us.** Each planetary civilization (Athenian, Spartan, Roman and so on) can carry a short four-chapter *reactive* arc that opens when the player first contacts, trades with or conquers it. That gives structure without a storyline, and the player still picks the order.

### B8. Loot and upgrades: Diablo III, Destiny, Warframe

- **Diablo III auction house** (MCV, GDC 2013) [S34]. **STATED**.
  - Jay Wilson said the gold and real-money auction houses "really hurt the game."
  - Blizzard expected a small minority to use them. In practice nearly all players used one or both, and **more than half used them regularly**.
  - They shifted the main motivation from slaying Diablo to earning money, and devalued items found as rewards.
  - **Lesson:** if a better item can be acquired outside play, found items stop being rewards.
- **Diablo III Loot 2.0** (Shacknews, 25 Feb 2014) [S35]. **STATED**.
  - Smart Drop tailors drops to the finding class, and legendaries got an across-the-board buff.
  - Lead designer Kevin Martens: "Legendaries were always supposed to be the best items in the game," and admitted the maths had not made that true.
  - Secondary sources describe the change as fewer, better drops.
  - **Lesson:** rarity must mean power or distinctiveness, or the rarity tier is noise.
- **Destiny: The Taken King** (Game Informer opinion, 2015) [S36]. **WEAK**.
  - Base Destiny's loot felt like "pulling on a slot machine that paid out in pennies."
  - The expansion separated Light level from character level and adjusted drop algorithms so players get gear they want.
  - No Bungie quotes were in the piece, and I found no Bungie postmortem. That is a gap.
- **Warframe.** Pages I tried did not load (PC Gamer drop-rates article). Search results say Digital Extremes published its drop tables [search only]. The published-odds point is the useful one; see Part C.

### B9. Shadow of Mordor's Nemesis system and the patent

**The patent.** US 10,926,179 B2, "Nemesis characters, nemesis forts, social vendettas and followers in computer games," assignee Warner Bros Entertainment [S37]. **STATED** (patent record).

- Priority date 2015-03-26, filed 2016-03-25, **granted 2021-02-23**. Google Patents lists an **adjusted expected expiry of 2036-08-11**, and notes that its legal-status entries are assumptions, not legal conclusions.
- The described method: a game event involving one NPC changes the stored parameters of a *second* NPC, for example rank changes in a faction hierarchy, fort (power-centre) configuration, and promotions such as a soldier rising after killing the player.
- I did not read the full claims text. **Not legal advice.**

**Design around it.** Avoid an orc-captain-style **hierarchy of named NPCs who are promoted, gain traits, and remember the player because of encounters, especially kills of the player**, organised around forts or power centres.

Safer ground for us:

- Faction-level memory (a city-state's attitude toward the player).
- Planet-level states.
- A deck-dealt director (L4D).
- Fleets that grow by economic rules rather than by individual NPC promotion from player encounters.

Have someone qualified check before shipping anything close to it.

### B10. Hades: unlocks under no-story freedom, and anti-addiction intent

- **God Mode** (Inverse, 2021) [S38]. **STATED**.
  - It reduces damage taken by **20%** and adds **2% per death**, capped at **80%**.
  - Greg Kasavin: "Our big focus from the start with Hades was how to take the sting of failure and reduce that as much as possible."
- **Mirror of Night and design intent** [search only; Tom's Guide body did not load].
  - Kasavin is reported to describe the Mirror as making you "meaningfully more powerful from one playthrough to the next."
  - He is also reported to describe the goal as being engrossing **without being addictive**: they avoided daily login bonuses, and the story resolves at several points so players can stop.
  - Treat these as unverified quotes, but the stance is the one we want.

**Lesson.** Permanent upgrades should carry over and should make failure sting less. A scaling assist that grows with failure, and is opt-in and invisible to no one, is a humane alternative to a hard difficulty wall.

### B11. Slay the Spire, Into the Breach, Factorio, Anno

- Mega Crit's GDC 2019 talk on metrics-driven balance exists [search only]. A third-party summary says single-player lets rare overpowered combos exist without hurting anyone.
- No primary sources opened for Into the Breach, Factorio or Anno. Gaps.

---

## Part C: Ethics and scope (what we deliberately leave out)

### The evidence

- **Zendle & Cairns (2018), *PLoS ONE*,** n = 7,422 gamers [S39]. **MEASURED** (cross-sectional survey).
  - Loot box spending was associated with problem-gambling severity (**η² = 0.054**), much more strongly than other in-game spending (**η² = 0.004**).
  - The direction of causation is unknown.
  - A 2019 replication with an unselected sample of 1,172 found η² = 0.051 [search only].
- **King & Delfabbro (2018), *Addiction* editorial** [S40]. **STATED** (expert commentary).
  - It names "predatory monetization schemes," with paywalls and pay-to-progress pressure in free-to-play among the tactics.
  - It cites Activision Blizzard's 2017 report of over $4 billion from microtransactions, more than half its annual income.
- **UK DCMS government response to the loot box call for evidence, 18 July 2022** [S41]. **STATED** (government, summarising an evidence review).
  - The commissioned rapid evidence assessment found 15 peer-reviewed studies linking loot boxes to problem gambling, but **no established causal link**.
  - The call drew over 32,000 player survey responses (not representative) and 50 direct submissions.
  - The government chose industry-led protections, not gambling law, partly because loot box rewards generally cannot be cashed out.
- **Ryan & Deci (2000):** threats, deadlines and imposed goals undermine intrinsic motivation [S1]. **MEASURED**.
- **Kasavin (Hades)** on avoiding login bonuses and building stop points [search only].

### What Ascent Flight leaves out, and why

1. **Loot boxes and any randomised purchase.** There is no money in the game, but the *shape* of a loot box can exist with in-game currency too: pay to open a sealed crate of random rewards. Spending earned resources is fine. A sealed-crate opening ritual built to maximise anticipation is out, because it trades on wanting over liking (A2).
2. **FOMO timers and limited-time content tied to the real clock.** Nothing in the game references wall-clock time. In-fiction clocks (B3) advance only while playing.
3. **Daily login streaks and rewards for opening the game.** They pay for the act of returning, not for play, and they punish a missed day. That is loss aversion (A6) aimed at stopping.
4. **Energy systems** that cap play per hour and refill over real time.
5. **Sunk-cost or decay punishments for stopping.** Nothing decays, rots, gets raided or loses value while the game is closed. Save anywhere and resume exactly.
6. **Pay-to-skip.** There is no store; we also do not design artificial grind that would *need* a skip.
7. **Predatory variable-ratio exploitation.** A random reward with no floor, no stated odds, no goal context, and an infinite repeat button. Every random payout has a visible floor and stated odds (A2, A3, A6).
8. **Manufactured "open loops" meant to nag between sessions** (the pop Zeigarnik version, A7). Clear resume points are fine (Ovsiankina).

### The principle

**Use the psychology to make the game compelling while it is being played, never to punish stopping.** Every hook in the plan should pass two tests:

- **The quit test:** does the player lose anything by closing the game for a week? The answer must be no.
- **The liking test:** would the player still choose this if they could see exactly how it works? Odds, floors and clocks are all on screen.

---

## Design principles this research supports

1. **Floor plus surprise.** Every fight, raid and mining payout has a **visible fixed floor** plus a variable bonus that can beat expectation. Predicted rewards stop registering as surprise; *omitted* expected rewards register as a negative signal (Schultz et al. 1997 [S3]). Never let a payout drop below what the UI promised.

2. **Invest in the earliest cue.** After learning, the dopamine response moves to the earliest reliable predictor of reward (Schultz et al. [S3]). Give the scanner ping, the cargo readout and the "enemy carrying rare alloy" tag real audio-visual weight, because that is where anticipation will live.

3. **Aim for liking, not just wanting.** Dopamine drives wanting, not liking (Berridge & Robinson 1998 [S4]). Judge every loop by whether it is pleasant once you know how it works. If a loop is only compelling because of uncertainty, redesign it.

4. **Goal gradient: always show the bar to the next rung.** Effort accelerates by about 20% as people near a goal (Kivetz et al. 2006 [S9]; Hull's rats [S9]). Every progression track (rank, ship tier, faction standing, planet development) has a visible bar with the exact requirement.

5. **Start rungs partly filled.** A 12-stamp card with 2 stamps pre-filled was completed in 12.7 days against 15.6 for a plain 10-stamp card, about 20% faster for the same 10 purchases (Kivetz et al. [S9]). Open each new tier with honest starting credit carried over from the last (say 15–20% of the bar), with the full requirement still shown.

6. **Pre-empt the post-reward slump.** Members slowed down after redeeming a card (Kivetz et al. [S9]). Reveal the next goal, already partly filled, **before** the current one pays out, and stagger tracks so two never complete on the same beat. This is the honest version of "one more turn."

7. **Choice of challenge inside the core loop.** Flow needs challenge matched to skill, and players differ (Csikszentmihalyi & LeFevre 1989 [S7]; Chen 2007 [S8]). Show threat ratings on every planet and fleet so the player picks their own difficulty by choosing *where to go*, with no menu needed. The player-chosen order is our flow tool.

8. **Autonomy is real only if orders are viable.** Autonomy independently predicts enjoyment and future play (Ryan, Rigby & Przybylski 2006, n = 730 [S2]). Balance so at least three opening conquest orders are competitive. If one order dominates, the "no fixed order" promise is false.

9. **Clear, immediate competence feedback.** Competence and intuitive controls drive enjoyment (Ryan et al. 2006 [S2]); effectance-promoting feedback supports intrinsic motivation (Ryan & Deci 2000 [S1]). After every fight, show what the player did well in specific terms ("3 kills without hull damage").

10. **Interesting decisions need legible consequences.** A choice only matters if players understand its consequences (Meier via Johnson 2009 [S15]). Every strategic choice (which world to take, what to build) shows a forecast of its main effects before commit. Tune in big steps: double it or halve it [S15].

11. **Slump fix: an escalating external clock that starts in the mid-game.** Stellaris's documented mid-game hole and its probabilistic crises (DD #33 [S20]; wiki weights 120 "nothing" vs 10 per crisis, rising, guaranteed after 50 years [S21]). XCOM 2's Avatar clock, built "to eliminate the late-game grind" (Solomon [S22]). Civ VII's end-of-Age crises [S18].
    - **Trigger** the clock on progress (e.g. when the player holds 3–4 worlds), not on wall time, and advance it only while playing.
    - **Show it** as a 12-segment bar.
    - **Let player actions knock segments off** (XCOM pattern [S23]), so it stays informational, not controlling (Ryan & Deci [S1]).

12. **Size has friction: conquered worlds can revolt.** Total War raises civil-war risk as you expand [S24]; Bannerlord rebellions rise with recent capture, culture mismatch and weak garrisons [S25]. Loyalty per conquered planet falls with cultural distance (Greek vs Roman lineage) and recency, and rises with garrison, trade and time. This counters snowball from the inside.

13. **Director: build-up, peak, relax, keyed on player intensity, controlling pacing not difficulty.** L4D: intensity rises with damage and nearby kills and decays over time. Hold the peak 3–5 s, fade, then **relax 30–45 s** or until the player has made progress, then build again. Change *how often* peaks happen, not *how strong* enemies are (Booth 2009 [S26]). Use the same four states for patrols, ambushes and pirate raids around the player's ship.

14. **Deal, don't roll, for set pieces.** L4D shuffles Tank / Witch / Nothing and deals them so the same event never repeats back to back [S26]. Build big events (crisis fleet, rogue comet, rebellion, derelict) as a shuffled deck with no immediate repeats. That is structured unpredictability, and it also serves the novelty finding (Bunzeck & Düzel 2006 [S13]).

15. **Two threat dials: wealth and time.** RimWorld scales threat to colony wealth, with an optional time curve (default 12 years to maximum threat) and an adaptation breather after disasters [S27]. Scale raid strength partly to the player's net worth (anti-hoarding) and partly to elapsed play time, with a cooldown after a heavy loss.

16. **Losses are setbacks with stakes, never campaign-enders.** Losses loom larger than gains (Kahneman & Tversky 1979 [S11]); EVE treats loss as a turning point [S31]; Homeworld's persistent fleet made ships matter, and its difficulty quietly adjusted to fleet size [S28]. Ships and planets can be lost. A lost ship returns at reduced cost and a lost planet can be retaken. Encounter strength nudges toward the player's current fleet size, within bounds.

17. **Failure should sting less over time, by opt-in.** Hades God Mode: 20% damage reduction, +2% per death, cap 80% (Inverse 2021 [S38]). Offer an opt-in assist that grows slightly with each defeat, with the numbers shown.

18. **Rarity must mean something, and found items must be the best route.** Diablo III's auction house devalued found items [S34]; Loot 2.0 had to make legendaries actually best [S35]; Destiny's "slot machine that paid out in pennies" [S36]. Each rarity tier is a clear step in power or uniqueness. No shop or trade path ever beats what play gives you. State the odds.

19. **Give each civilization a short reactive arc.** ES2's major faction quests: about 4 chapters, triggered by play, choices that reflect or challenge a playstyle, bigger rewards for harder routes (Amplitude 2016 [S33]). Each Greek or Roman planetary culture gets a 3–4 chapter arc that opens on first contact, trade or conquest, in any order. Structure without a storyline.

20. **Resume, don't nag.** The Zeigarnik memory effect failed meta-analysis; the tendency to *resume* interrupted tasks held (Ghibellini & Meier 2025 [S12]). On load, put the player beside their last unfinished project with the next step shown. Nothing happens to them while away, and nothing is engineered to nag between sessions.

---

## Sources opened (all opened 2026-10-19)

Psychology:

- **[S1]** Ryan, R. M. & Deci, E. L. "Self-Determination Theory and the Facilitation of Intrinsic Motivation, Social Development, and Well-Being." *American Psychologist* 55(1), 2000. https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf — opened 2026-10-19 (PDF text extracted).
- **[S2]** Ryan, R. M., Rigby, C. S. & Przybylski, A. "The Motivational Pull of Video Games: A Self-Determination Theory Approach." *Motivation and Emotion*, 2006. https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf — opened 2026-10-19 (PDF text extracted).
- **[S3]** Schultz, W., Dayan, P. & Montague, P. R. "A Neural Substrate of Prediction and Reward." *Science* 275, 1997. Abstract: https://www.gatsby.ucl.ac.uk/~dayan/papers/sdm97.html; full text: https://www.its.caltech.edu/~jkenny/nb250c/papers/Schultz-1997.pdf — both opened 2026-10-19.
- **[S4]** Berridge, K. C. & Robinson, T. E. "What is the role of dopamine in reward: hedonic impact, reward learning, or incentive salience?" *Brain Research Reviews* 28, 1998. https://www.lecerveau.ca/flash/capsules/articles_pdf/dopamine.pdf — opened 2026-10-19 (PDF text extracted).
- **[S5]** Simply Psychology. "Schedules of Reinforcement." (pop explainer, undated). https://www.simplypsychology.org/schedules-of-reinforcement.html — opened 2026-10-19.
- **[S6]** Laskowski, C. "Impacts of reward schedules and a dopamine agonist on dopamine receptor expression in an animal model of gambling addiction." PhD thesis, University of Lethbridge, 2022. https://opus.uleth.ca/items/a6ff7385-9774-4475-bdbf-8d64d258d230/full — opened 2026-10-19.
- **[S7]** Csikszentmihalyi, M. & LeFevre, J. "Optimal experience in work and leisure." *JPSP* 56(5), 1989 (bibliographic record with abstract). https://onwork.edu.au/bibitem/1989-Csikszentmihalyi,M-LeFevre,J-Optimal+experience+in+work+and+leisure/ — opened 2026-10-19.
- **[S8]** Chen, J. "Flow in Games (and Everything Else)." *Communications of the ACM* 50(4), 2007. https://khoury.northeastern.edu/~lieber/courses/csu670/f08/materials/p31-chen-flow-in-games.pdf — opened 2026-10-19 (PDF text extracted).
- **[S9]** Kivetz, R., Urminsky, O. & Zheng, Y. "The Goal-Gradient Hypothesis Resurrected: Purchase Acceleration, Illusionary Goal Progress, and Customer Retention." *Journal of Marketing Research* 43, 2006 (includes Hull 1932 quote and Hull 1934 figure). https://business.columbia.edu/sites/default/files-efs/pubfiles/1200/goalgradient.pdf — opened 2026-10-19 (PDF text extracted).
- **[S10]** Hull, C. L. "The concept of the habit-family hierarchy and maze learning," part 2, 1934 (Classics in the History of Psychology). https://psychclassics.yorku.ca/Hull/Hierarchy/part2.htm — opened 2026-10-19.
- **[S11]** Kahneman, D. & Tversky, A. "Prospect Theory: An Analysis of Decision under Risk." *Econometrica* 47(2), 1979 (abstract page). https://casact.org/abstract/prospect-theory-analysis-decision-under-risk — opened 2026-10-19.
- **[S12]** Ghibellini, R. & Meier, B. "Interruption, recall and resumption: a meta-analysis of the Zeigarnik and Ovsiankina effects." *Humanities and Social Sciences Communications* 12, 2025 (RePEc abstract). https://ideas.repec.org/a/pal/palcom/v12y2025i1d10.1057_s41599-025-05000-w.html — opened 2026-10-19.
- **[S13]** Bunzeck, N. & Düzel, E. "Absolute coding of stimulus novelty in the human substantia nigra/VTA." *Neuron* 51(3), 2006. https://research.uni-luebeck.de/en/publications/absolute-coding-of-stimulus-novelty-in-the-human-substantia-nigra/ — opened 2026-10-19.
- **[S14]** Quantic Foundry. "Gamer Motivation Model: Reference Sheets & Details," 2019. https://quanticfoundry.com/wp-content/uploads/2019/04/Gamer-Motivation-Model-Reference.pdf — opened 2026-10-19 (PDF text extracted).

Games:

- **[S15]** Johnson, S. "Analysis: Sid Meier's Key Design Lessons." *Game Developer*, 2009. https://www.gamedeveloper.com/pc/analysis-sid-meier-s-key-design-lessons — opened 2026-10-19.
- **[S16]** *Game Developer*. "Video: Sid Meier explores interesting decisions in gameplay" (GDC 2012 talk page). https://gamedeveloper.com/design/video-sid-meier-explores-interesting-decisions-in-gameplay — opened 2026-10-19 (video not watched).
- **[S17]** Robinson, J. "Old World is a 4X game for people who think Civilization is too long." PCGamesN, 2021. https://www.pcgamesn.com/old-world/civilization-too-long — opened 2026-10-19.
- **[S18]** Beach, E. / Firaxis. "Civilization VII Dev Diary: Ages." 2024. https://civilization.2k.com/civ-vii/archive/dev-diary/ages/ — opened 2026-10-19.
- **[S19]** PC Games Insider. "Civilization VII breaks new ground: how a fresh Ages system redefines 4X strategy games" (Ed Beach interview), 27 Aug 2024. https://www.pcgamesinsider.biz/interviews-and-opinion/74659/civilization-vii-breaks-new-ground-how-a-fresh-ages-system-redefines-4x-strategy-games/ — opened 2026-10-19.
- **[S20]** Paradox (Stellaris game director). "Stellaris Dev Diary #33 – The Maiden Voyage," 16 May 2016 (Gamesplanet repost). https://us.gamesplanet.com/community/stellaris-steam-key--3008-1/news_updates/139485-stellaris-dev-diary-33-the-maiden-voyage — opened 2026-10-19.
- **[S21]** Stellaris Wiki (community). "Crisis." https://stellaris.paradoxwikis.com/Crisis — opened 2026-10-19.
- **[S22]** Futter, M. "XCOM 2's Board Game Influences And The Race Against The Alien Clock." Game Informer, 10 Dec 2015. https://gameinformer.com/games/xcom_2/b/pc/archive/2015/12/10/xcom-2s-board-game-influences-and-the-race-against-the-alien-clock — opened 2026-10-19.
- **[S23]** UFOpaedia (community). "Avatar Project (XCOM2)." https://ufopaedia.org/Avatar_Project_(XCOM2) — opened 2026-10-19.
- **[S24]** Creative Assembly / Total War Wiki. "Total War: ROME II: Patch 15" notes. https://wiki.totalwar.com/w/Total_War_ROME_II:_Patch_15 — opened 2026-10-19.
- **[S25]** GameBanshee. "Mount & Blade II: Bannerlord Development Update – Rebellions, Missions and More," Dec 2020. https://www.gamebanshee.com/3hc3h — opened 2026-10-19.
- **[S26]** Booth, M. (Valve). "The AI Systems of Left 4 Dead." AIIDE 2009 slides (hosted copy). https://www.readkong.com/page/the-ai-systems-of-left-4-dead-michael-booth-valve-9664541 — opened 2026-10-19.
- **[S27]** RimWorld Wiki (community). "AI Storytellers." https://www.rimworldwiki.com/wiki/AI_Storytellers — opened 2026-10-19.
- **[S28]** Wikipedia. "Homeworld." https://en.wikipedia.org/wiki/Homeworld — opened 2026-10-19.
- **[S29]** Wikipedia. "FTL: Faster Than Light." https://en.wikipedia.org/wiki/FTL:_Faster_Than_Light — opened 2026-10-19.
- **[S30]** *Game Developer*. "Video: Designing without a pitch – the FTL postmortem" (GDC 2013, Davis & Ma). https://gamedeveloper.com/audio/video-designing-without-a-pitch---the-i-ftl-i-postmortem — opened 2026-10-19 (video not watched).
- **[S31]** Grubb, J. "People despise losing progress, so why is loss key to Eve Online." GamesBeat, 2020. https://gamesbeat.com/people-despise-losing-progress-so-why-is-loss-key-to-eve-online/ — opened 2026-10-19.
- **[S32]** Wikipedia. "Sins of a Solar Empire." https://en.wikipedia.org/wiki/Sins_of_a_Solar_Empire — opened 2026-10-19.
- **[S33]** Amplitude Studios (dev account WeaponizedCaffeine). "Community GDD 9 Update – Narration," 5 Oct 2016. https://community.amplitude-studios.com/amplitude-studios/endless-space-2/forums/66-game-design/threads/20680-community-gdd-9-update-narration?page=1 — opened 2026-10-19.
- **[S34]** MCV/Develop. "GDC 13: Diablo III auction houses hurt game, admits director," 29 Mar 2013. https://www.mcvuk.com/development-news/gdc-13-diablo-iii-auction-houses-hurt-game-admits-director/ — opened 2026-10-19.
- **[S35]** Shacknews. "Diablo 3 patch 2.0.1 out now with Loot 2.0," 25 Feb 2014. https://www.shacknews.com/article/83266/diablo-3-patch-201-deploys-with-loot-20 — opened 2026-10-19.
- **[S36]** Reeves, B. "The Taken King Fixes Destiny's Three Biggest Problems." Game Informer, 14 Aug 2015. https://gameinformer.com/b/features/archive/2015/08/14/the-taken-king-fixes-destinys-three-biggest-problems — opened 2026-10-19.
- **[S37]** Warner Bros Entertainment Inc. US Patent 10,926,179 B2, "Nemesis characters, nemesis forts, social vendettas and followers in computer games," granted 2021. https://patents.google.com/patent/US10926179B2/en — opened 2026-10-19 (first ~100k characters read; claims not read in full).
- **[S38]** Franzese, T. "Hades God Mode interview." Inverse, 2021. https://www.inverse.com/gaming/hades-god-mode-interview — opened 2026-10-19.

Ethics:

- **[S39]** Zendle, D. & Cairns, P. "Video game loot boxes are linked to problem gambling: Results of a large-scale survey." *PLoS ONE*, 2018. https://eprints.whiterose.ac.uk/139116/ — opened 2026-10-19.
- **[S40]** King, D. L. & Delfabbro, P. H. "Predatory monetization schemes in video games (e.g. 'loot boxes') and internet gaming disorder." *Addiction* 113(11), 2018. https://researchnow.flinders.edu.au/en/publications/predatory-monetization-schemes-in-video-games-eg-loot-boxes-and-i/ — opened 2026-10-19.
- **[S41]** UK DCMS. "Government response to the call for evidence on loot boxes in video games," 18 Jul 2022. https://www.gov.uk/government/consultations/loot-boxes-in-video-games-call-for-evidence/outcome/government-response-to-the-call-for-evidence-on-loot-boxes-in-video-games — opened 2026-10-19 (first ~100k characters read).

### Seen in search results only (page not opened; cited above as [search only])

- Quantic Foundry, "Gamers Have Become Less Interested in Strategic Thinking and Planning," 2024, https://quanticfoundry.com/2024/05/21/strategy-decline/ (fetch returned 403).
- Quantic Foundry, "In 4X Strategy, Younger and Male Gamers Prefer Military Conquest…," 2016, https://quanticfoundry.com/2016/03/02/4x-strategy/ (403).
- Paradox, "Stellaris Dev Diary #30 – Late Game Crises," 2016, https://forum.paradoxplaza.com/forum/developer-diary/stellaris-dev-diary-30-late-game-crises.921629/ (browser-validation wall).
- Tom's Guide, "Hades exclusive: Supergiant explains why we love (and hate) roguelikes," https://www.tomsguide.com/uk/features/hades-exclusive-interview-supergiant (body did not load).
- PC Gamer, "9 things you should know before starting XCOM 2," https://www.pcgamer.com/xcom-2-guide (body did not load; the 20-day figure comes from the snippet).
- Zendle, Meyer & Over 2019 replication, via https://pure.york.ac.uk/portal/en/publications/loot-boxes-are-again-linked-to-problem-gambling-results-of-a-repl/
- *Journal of Gambling Studies* 2019 random-ratio rat paper, https://link.springer.com/article/10.1007/s10899-019-09852-1 (login redirect).
- Wikipedia "RimWorld" (storyteller modelled on L4D Director); GDC Vault listing for Sylvester's 2017 RimWorld talk; GDC 2019 Slay the Spire listing; PC Gamer Endless Space 2 feature via PressReader (403).

## Not opened (relevant but not read this session)

- Ferster, C. B. & Skinner, B. F. *Schedules of Reinforcement*, 1957 (book).
- Csikszentmihalyi, M. *Flow: The Psychology of Optimal Experience*, 1990 (book).
- Hull, C. L. "The goal gradient hypothesis and maze learning," *Psychological Review*, 1932 (read only via the Kivetz et al. quotation).
- Deci, Koestner & Ryan 1999 meta-analysis on rewards (read only via Ryan & Deci 2000).
- Yee, N. "Motivations for play in online games," 2006.
- Rigby & Ryan, *Glued to Games*, 2011 (the PENS book).
- Valve's own copy of Booth's L4D PDF (valvesoftware.com returned 404; a hosted copy was used).
- Sid Meier's GDC 2012 "Interesting Decisions" video and *Sid Meier's Memoir!* (2020).
- Any primary Bungie (Destiny) postmortem, Digital Extremes (Warframe) design talk, Creative Assembly (Attila) dev diary, Egosoft (X4) design interview, Wube (Factorio) Friday Facts on core loop, Ubisoft/Blue Byte (Anno) dev diary, Subset (Into the Breach) talk.
- Ghibellini & Meier 2025 full text (only the abstract was read; effect sizes not verified).

## Gaps and cautions

- **Total War Attila / end-game crisis:** no Creative Assembly source found; only Rome II Patch 15 notes.
- **Destiny and Warframe:** no developer-authored source opened; claims about them are WEAK.
- **"One more turn":** no primary explanation from Meier found; goal-gradient research is the measured proxy.
- **Zeigarnik / Ovsiankina numbers:** the meta-analysis abstract gives no numbers; secondary figures were not verified.
- **Nemesis patent:** the claims were not read in full. The design-around guidance is caution, not legal advice.
- **Animal-to-human transfer:** Schultz (monkeys), Berridge (rats), Hull (rats) and Laskowski (rats) are mechanism evidence, not player data. The human evidence here is Kivetz (field), Ryan et al. (lab and survey), Csikszentmihalyi & LeFevre (experience sampling), Bunzeck & Düzel (fMRI) and Zendle & Cairns (survey).
