# Arsenal research: munitions, shields, countermeasures, drones, upgrades

Written 2026-10-18 for the arsenal thread, before building. Part 1 is what I chose and why. Part 2 is the source survey
it rests on: eight games and the physics, every source cited with its URL and the date it was read. All item names in
the game are generic and my own; no trademarked item names are used.

**How it was gathered.** A research pass on 2026-10-18 fetched and read every cited page. Some pages could not be
fetched: the Fandom wikis (Elite, FTL, Freelancer, Everspace) returned HTTP 402, and the FreeSpace wiki
(wiki.hard-light.net) returned 403. Those entries lean on Wikipedia, player threads and developer tips, so they are
thinner, and they say so. Anything the pass knew without reading a page is marked "(from memory, not read)". Lines
marked "search snippet only" were seen in search summaries and are not cited as read.

---

## Part 1: what I chose and why

### The mechanics that make combat interesting (from Part 2)

1. **Two layers, two kinds of damage.** Every source with shields separates shield-killing damage from hull-killing
   damage (Elite's thermal against kinetic, EVE's four types, Everspace's pulse laser then gatling, Star Citizen's
   energy against ballistic). It makes the player switch weapons during a fight, which is a decision instead of a
   held button.
2. **Partial shield bypass.** In Star Citizen a share of ballistic damage passes the shield (about 20 to 60%), and
   Elite's railguns pass through. A kinetic slug that leaks through means a shield is never total protection.
3. **An energy budget.** EVE's capacitor, Elite's weapons capacitor, Everspace's single energy core, X4's heat and
   FreeSpace's power transfer all make firing cost something.
4. **Ammo against energy.** Free but costly primaries, plus scarce explosive secondaries, gives a rhythm of steady
   fire and finishers (Star Citizen, Everspace 2, FTL, EVE).
5. **Missiles are a slow threat with a counter.** A lock, a warning, a decoy, then a hit or a dodge (Freelancer,
   FreeSpace, X4, Star Citizen; the real flare and chaff pages). Star Citizen's seekers each answer to a different
   decoy, so no single countermeasure works on everything.
6. **Point defence as a job.** Beams, rapid guns and defence drones kill missiles (X4, Star Citizen, FTL, Atomic
   Rockets).
7. **Disabling instead of destroying.** Ion, distortion, EMP and cruise disruptors (FTL, Star Citizen, FreeSpace,
   Freelancer, Everspace 2). A disabled ship is a setup for boarding, capture or looting later, which the economy can
   use.
8. **Area damage.** Flak, mines and splash reward or punish ships flying close together (FreeSpace, EVE, X4,
   Everspace).
9. **Shield variants as play styles.** A big shield that comes back slowly against a small one that comes back fast
   (Elite's prismatic against bi-weave, Star Citizen's classes, X4's sizes, Everspace's front projector).
10. **Drones as an attention economy.** A limited number fitted, fragile but useful, killed first (EVE, X4, FTL,
    Everspace).
11. **Upgrades as trade-offs, not just bigger numbers.** Tiers that cost something, and sidegrades (EVE, Star
    Citizen, Everspace, FTL).

### What was built

**Damage types.** Four: energy, kinetic, explosive and ion. EVE has four, Elite three; four is enough for a hardened
shield to resist by type without needing a chart. Every hit splits like this: the munition's *pierce* share goes
straight to the hull; the rest meets the shield at damage × shieldMul × (1 − resistance); whatever the shield cannot
hold carries over to the hull at hullMul, minus armour resistance. Elite's carry-over rule and Star Citizen's ballistic
bypass both fit this one formula, and it is tested (`src/lib/shields.ts`).

**Ten munitions** (`src/lib/munitions.ts`), each with one clear role:

| # | Munition | Type | Role, and where it comes from |
|---|---|---|---|
| 1 | Pulse laser (the original laser) | energy | All-round gun on the capacitor. Everspace's shield stripper, FreeSpace's light laser. |
| 2 | Beam laser | energy | Hits instantly while held on target, short range, heavy energy drain. Physics: a laser needs to dwell on one spot. X4's beam point defence. |
| 3 | Plasma bolt | energy | Slow, heavy, weak on shields, strong on bare hull: the finisher. Star Citizen's slow, high-damage classes. |
| 4 | Railgun slug | kinetic | Very fast, long range, 40% passes the shield. Star Citizen's ballistic bypass, Elite's rail, real railgun velocities. Ammo plus an energy cost, as the physics demands power. |
| 5 | Flak burst | explosive | Proximity fuse, area burst, kills missiles caught in it. FreeSpace's flak, Everspace's flak against swarms. |
| 6 | Seeker missile (the original missile) | explosive | Homes gently with a held lock; the homing lets go near the end so a ship can dodge. |
| 7 | Torpedo | explosive | Anti-capital: 3 s lock required, slow, a huge blast. EVE's torpedoes and FreeSpace's bombs: slow enough to be dodged, decoyed or shot down. |
| 8 | Swarm missiles | explosive | Six agile mini-missiles a salvo; each must be decoyed on its own. Answers flares by number. Star Citizen's cluster payloads. |
| 9 | Ion shot | ion | Strips shields 3×, barely scratches hull, disables a ship whose shield is down. FTL's ion, Star Citizen's distortion, Freelancer's EMP mines. |
| 10 | Proximity mine | explosive | Dropped behind; arms after 1.5 s; bursts on a hostile within 8 units. X4's and Everspace's mines; area denial on a patrol route. |

Lock rules come in three kinds: *none*, *optional* (homes only with a held lock, as the original missile did) and
*required* (the torpedo will not fire unlocked). Lock time is per munition (swarm 0.8 s, seeker 1.5 s, torpedo 3 s)
and scaled by the targeting computer.

**Energy and ammunition.** One capacitor for weapon energy, refilled by the reactor (Everspace's single energy core is
the simplest version that still makes firing cost something). Energy weapons draw on it; missiles, flak, mines and
rail slugs use ammunition (the rail uses both). I did not build heat (X4, Elite). With only one capacitor it would be
a second meter measuring much the same thing. It is listed below as a candidate.

**Shields** (`src/lib/shields.ts`), four technologies in three tiers each:
- *Deflector*: a plain bubble that comes back quickly. The baseline.
- *Hardened*: less capacity and slow regeneration, but resistances by damage type (EVE's resist profiles, Star
  Citizen's splash guard).
- *Bi-facet*: separate front and rear shields; a hit lands on the side it comes from (Star Citizen's front/back layout,
  FreeSpace's quadrants, Everspace's front projector).
- *Capacitor shield*: low capacity, fast regeneration, and the weapons draw on it when the capacitor is empty
  (Everspace's Daredevil trade and FreeSpace's power transfer, made into one rule).

Each regenerates once it has gone a set time without a hit (X4's recharge delay, Star Citizen's reboot). A disabled
ship's shield does not regenerate.

**Countermeasures** (`src/lib/tech.ts`): decoy flares (a missile that sees one may chase it), chaff (breaks a lock
being held on the ship), and a passive jammer (locks take longer and incoming missiles turn worse). This is the real
flare/chaff split, given game rules. The targeting computer's *seeker grade* is the counter-countermeasure: a better
computer ignores decoys more often (spectral discrimination on the real flare page, ECCM in EVE).

**Drones**: attack (shoots the nearest hostile), repair (hull and shield back over time) and point defence (shoots
down incoming missiles). Two drone slots. These are EVE's and FTL's three basic jobs.

**Other modules**: targeting computer tiers (lock time, seeker grade, lead-indicator reach), reactor tiers (capacity
and refill), armour plating (extra hull and resistance by type; the whipple-shield physics is why kinetic is resisted
most), afterburner tiers (boost multiplier).

**Upgrades as data** (`src/lib/modules.ts`): one table of every module with its slot, tier and one line on what it
changes. `cost` is null on every row. Prices, and how upgrades are earned, are the economy, which is undecided and
Caleb's call.

### Researched candidates, not built

- **Heat** as a second budget, with a weapon cut-out on overheat (X4, Elite, Star Citizen).
- **Subsystem targeting**: aiming at engines, turrets or the reactor (Elite modules, FreeSpace turrets, FTL systems).
  Needs ships with parts; the ship-types branch is the place for it.
- **Seeker kinds** (heat, radar, visual), each answering to a different decoy (Star Citizen). Flares and chaff are
  already separate, so this is a small step once enemies fire missiles.
- **Electronic warfare debuffs**: sensor damping (shorter lock range), target painting (bigger hit radius for the whole
  side), tracking disruption (EVE).
- **Capacitor drain** weapons that take energy from the target (EVE's neutralisers and Nosferatu).
- **Shield cell bank**: a consumable that refills the shield on demand (Elite).
- **Boarding and capture** of a disabled ship (X4, FTL). The ion disable is the hook for it.
- **Ammo types** for one gun (Elite's engineered rounds, EVE's charges): incendiary for shields, corrosive for hull.
- **Light lag and evasion**: at long range a ship that moves unpredictably beats guided shots (Atomic Rockets).

### What is unproven or left open

- Balance and feel are Caleb's. Every number is a first guess on the original laser and missile's scale.
- Enemies do not shoot back, so the player's shield, flares, point defence and repair drone are proved against a test
  missile and a test hit (dev hooks), not against an enemy.
- Prices and how upgrades are earned are left empty on purpose.

---

## Part 2: the source survey

---

## 1. Elite Dangerous

Sources are a player forum thread, a community damage-math page and Wikipedia. The official wiki was not reachable.

(a) Damage types. Weapons deal thermal, kinetic or explosive damage. Collisions use a fourth type that weapons cannot modify (math page). Shields multiply each type by a per-type defence value. Shields take extra thermal and resist kinetic and explosive much more strongly. If the shield breaks mid-hit, the leftover carries to the hull. If the shield holds, the hull takes nothing. Hulls resist thermal and are weak to kinetic and explosive (forum player). Hull damage runs a pipeline:
- armour per-type multiplier (example 0.85 kinetic for reactive composite);
- a hardness-vs-piercing scaling, where a small pulse laser does only about 31% against an Anaconda's hardness;
- a random penetration roll, roughly 40% at full hull health rising to about 80% near death;
- then a ray through the ship that picks an internal module. A hit module takes most of the damage (80% or more) and the hull gets the rest.
Railguns pass through any current ship.

(b) Lock-on and countermeasures. Not covered by a page I read. Search snippets (forum summaries, not cited) said heat sinks break missile locks, chaff targets gimballed and turreted weapons, and point defence and ECM address missiles. (from memory, not read: shutdown-field neutralisers and ECM exist as utility modules.)

(c) Heat, energy, capacitor. Railguns hit shields hard but are not sustained DPS, because they produce a lot of heat and draw heavily on the weapons capacitor. A player suggests swapping them for lasers (forum thread).

(d) Ammo vs energy. Multicannon rounds can be specialised. Incendiary rounds are better against shields and corrosive rounds better against hull, and some kinetic damage is still wanted (forum thread).

(e) Range, speed, rate. Not covered beyond the railgun heat and capacitor cost.

(f) Area damage. Not covered.

(g) Disabling. Hits on internal modules can degrade systems. The math page says a hit module absorbs most of the damage. Wikipedia notes the Guardian Nanite Torpedo Pylon was added to stop Titans venting heat, exposing their cores.

(h) Shield variants. Bi-weave shields recharge fast and are suited to short, intermittent fights. Prismatic shields hold more but come back slowly. A Shield Cell Bank (SCB) fully recharges shields on demand, and players say a Guardian Shield Booster adds a lot (forum thread). The same thread says a Krait with bi-weave has over 1,000 total hitpoints.

(i) Drones. Not covered.

(j) Upgrades. Wikipedia says ships and modules are swappable and bought with credits. Horizons added materials gathering and crafting to upgrade weapons. Guardian ruins give materials for Guardian and hybrid modules that are more effective against Thargoid ships. The forum thread mentions engineering unlocking special ammo types.

Source: https://steamcommunity.com/app/359320/discussions/0/1743355067113171152 (read 2026-10-18)
Source: https://math.edomh.nl/pages/ship-damage/ (read 2026-10-18)
Source: https://en.wikipedia.org/wiki/Elite_Dangerous (read 2026-10-18)

---

## 2. EVE Online

(a) Damage types. There are four: EM, thermal, kinetic and explosive. Most weapons mix two. Shields are weakest to EM and strongest against explosive. Armour and hull follow their own native profiles, and fits and modules can patch weaknesses. Rough mixes:
- energy turrets about 60% EM and 40% thermal;
- hybrid turrets about 60% kinetic and 40% thermal;
- projectile turrets always include kinetic;
- each faction's drones do exactly one type;
- missile ammo variants each do one type.
NPC factions have fixed profiles. Guristas is about 79% kinetic, Sansha about 53% EM, and "omni" NPCs are even across all four.

(b) Lock-on and countermeasures. Missile range is velocity times flight time, not optimal and falloff. A missile in range always hits, but damage is reduced if the target is faster than the explosion velocity or smaller than the explosion radius. Guidance disruptors cut missile speed, flight time and explosion velocity by about 8% (T1) and widen the explosion radius. Defender missiles intercept bombs (120 s reactivation). Smartbombs and bombs can destroy missiles, so fleets "firewall" with several smartbombs. Missiles in flight vanish if the shooter warps, and very fast interceptors can outrun them. ECM breaks locks. Each 20 s cycle, success chance is jam strength divided by the target's sensor strength. Racial ECM I is 3.0 on-race and 1.0 off-race, and burst jammers are 6.0 at 5 km. Counters are sensor boosters and signal amplifiers (the "ECCM" role).

(c) Capacitor. Recharge is nonlinear: slowest near empty or full, fastest near 25%. Below about 25% the cap collapses under load. Fits are "cap-stable" or show a depletion timer. Injectors add a fixed amount per charge (a Cap Booster 200 gives 200 GJ) and are for short fights. Neutralizers cost the user cap but drain more from the target. Nosferatu drain the target without using the user's cap. Running dry shuts off cap-using modules after their cycle.

(d) Ammo vs energy. Turrets use charges or crystals. Missiles are limited ammo. Capacitor funds active modules.

(e) Range, speed, rate trade-offs. Rockets, HAM and torpedoes are short range, high damage and good application. Light, heavy and cruise are long range with worse application on small targets. T2 Javelin trades damage for range, and Rage does the opposite. Rapid launchers fire fast but have 19 to 30 shot clips and 35 to 40 s reloads. Gallente drones deal the most damage and are slowest. Minmatar are fastest and weakest.

(f) Area damage. Explosion radius against signature, smartbombs and bombs. Auto-targeting missiles hit whatever last shot at you.

(g) Disabling. EWAR is the whole disabling family:
- tracking disruption cuts turret optimal, falloff and tracking by about 15 to 17%;
- sensor dampening cuts lock range and scan resolution by about 14 to 15%, with no chance roll;
- target painting adds 25 to 30% signature for the whole fleet;
- capacitor warfare drains cap.
Racial specialties are Caldari ECM, Amarr weapon disruption, Gallente dampening and Minmatar painting.

(h) Shield variants. Not covered beyond native resistances and resist modules.

(i) Drones. The bay is a fixed volume. Bandwidth limits drones in space (5 Mbit/s each for light, with a skill cap of five at level V). Control range starts at 20 km and can reach 60 km with skills, with augmentors extending it. Sample T1 DPS is 6.5 to 8 (light), 10.4 to 12.8 (medium) and 20.8 to 25.6 (heavy). Sentries are stationary long-range turrets with about 2,800 HP. Logistics drones repair 12, 24 and 60 HP per cycle (light, medium, heavy), and a full flight is worth less than one repair module. ECM drones (strength 1 to 2) jam for 5 s versus 20 s for modules. Other drone jobs are EW, salvage and mining.

(j) Upgrades. Tech 1, named, T2 and higher meta tiers; skills with percentage bonuses per level (rate of fire +2% per level, damage +5% per level and so on); rigs that each improve one stat; boosters (Crash, Pyrolancea); and CPU and powergrid fitting limits. (The module-tiers page 404'd, so meta-tier names are from memory, not read.)

Source: https://wiki.eveuniversity.org/Damage_types (read 2026-10-18)
Source: https://wiki.eveuniversity.org/Electronic_warfare (read 2026-10-18)
Source: https://wiki.eveuniversity.org/Drones (read 2026-10-18)
Source: https://wiki.eveuniversity.org/Capacitor (read 2026-10-18)
Source: https://wiki.eveuniversity.org/Missiles (read 2026-10-18)

---

## 3. X4: Foundations

(a) Damage vs shields and hull. Shields are a regenerating layer in front of hull damage. A forum summary of a 2019 patch note says ion weapons deal more anti-shield damage and less anti-hull damage (search snippet only, not cited as read). Weapons (as against turrets) are tied to the ship's forward facing and gimbal.

(b) Lock-on and countermeasures. Flares are a consumable that automatically decoys missiles. The consumables page lists a price, a 1 s build time and ingredients (1 advanced composite plus 9 energy cells). Forum users report flares work but supply is limited, so they do not sustain long fights. Tracking missiles are a serious threat to larger ships. Turrets can be set to a "missile defense" mode. Players say beam turrets are the best missile killers, but kills were unconfirmed in one thread. The thread also reported that light tracking missiles struggle to hit fighters even without flares.

(c) Heat. Firing builds heat, and an overheated weapon is disabled until it cools. Cooling slows when several weapons heat at once. The page says the detailed breakdown is "coming soon."

(d) Ammo vs energy. Missiles and consumables are stocked items. Guns are heat-limited.

(e) Range, speed, rate. Small weapons fire faster and track better with less damage. Medium weapons hit harder and reach farther, but are less accurate and have slower projectiles. Destroyer main batteries outrange turrets. Battleship batteries deal the most damage, with limits and hard acquisition. Higher damage and range generally means slower fire, worse accuracy or slower shots.

(f) Area damage. Mines list 10k explosion damage each. A forum post says missiles do shield damage to every turret in their area of effect. Heavy dumbfire missiles come close to large plasma turrets against capital ships.

(g) Disabling. Fighters can strip a capital ship's turrets and engines. Boarding with marines can capture a ship. Mine types: plain, tracker (60 s build) and friend/foe (60 s build).

(h) Shield variants. Sizes are small, medium, large and extra large. From the shield page:
- small: max about 703 to 1,552, recharge delay roughly 9 to 14 s;
- medium: max about 4,375 to 6,746, delay under 1 s;
- large: max about 33k to 51k, no recharge delay;
- extra large: max about 110k to 142k, no recharge delay.
Strength rises with size and Mk1 to Mk3. Hull values are attached to large and extra large shields. These figures are as of patch 3.10 per the page.

(i) Drones. Consumable drones are deployed as independent vessels. Defence drone: 90 s build, hull 1,900, S pulse laser. Mining drone: hull 1,700, miner ships only. Building/repair drone: hull 207. Cargo drone: hull 523. Laser towers (Mk1 hull 1,001, Mk2 hull 5,000) and satellites (30 km and 75 km radar) are also deployable. Flak turrets and particle repeaters are recommended against fighters and drones.

(j) Upgrades. Equipment slots: engines, thrusters, shields, weapons, turrets, software, crew and consumables. Faction and Mk1-3 tiers. Ship class decides which weapons fit. The pages I read did not cover mods or engineering.

Source: https://wiki.egosoft.com/X4%20Foundations%20Wiki/Manual%20and%20Guides/Objects%20in%20the%20Game%20Universe/Equipment/Ship%20Weapons/BeamGun%20Forward%20Weapons/ (read 2026-10-18)
Source: https://wiki.egosoft.com/X4%20Foundations%20Wiki/Manual%20and%20Guides/Objects%20in%20the%20Game%20Universe/Equipment/Ship%20Weapons/ (read 2026-10-18)
Source: https://wiki.egosoft.com/X4%20Foundations%20Wiki/Manual%20and%20Guides/Objects%20in%20the%20Game%20Universe/Equipment/ (read 2026-10-18)
Source: https://wiki.egosoft.com/X4%20Foundations%20Wiki/Manual%20and%20Guides/Objects%20in%20the%20Game%20Universe/Equipment/Consumables/ (read 2026-10-18)
Source: https://wiki.egosoft.com/X4%20Foundations%20Wiki/Manual%20and%20Guides/Objects%20in%20the%20Game%20Universe/Equipment/Shields/ (read 2026-10-18)
Source: https://steamcommunity.com/app/392160/discussions/0/3056237435831022733 (read 2026-10-18)
Source: https://steamcommunity.com/app/392160/discussions/0/1743353164094886644 (read 2026-10-18)

---

## 4. Star Citizen

The wiki pages carry "outdated information" notices, so numbers may have moved.

(a) Damage vs shields and hull. Energy weapons hit shields first, then the hull. Ballistic rounds bypass roughly 20 to 60% of shield strength depending on the shield and deal that share to the hull. Hull damage starts only when shields are down. Distortion weapons deliver electrical discharge: they cannot damage hull directly, strip shields (including adjacent faces) and degrade power systems on unshielded hulls.

(b) Lock-on and countermeasures. Missile guidance comes in three types:
- Infrared (IR): the hotter the target the faster the lock, a launch gives little warning, it can reacquire while the target emits heat, and a fully cold target cannot be locked.
- Electromagnetic (EM): an active radar pulse that acquires fast without line of sight but warns the target.
- Cross section (CS): visual identification, so larger ships lock faster, it gives little warning, and it cannot reacquire once lost.
Chaff counters EM and flares counter IR. The page names no countermeasure for CS.

(c) Heat, energy, power. Energy weapons draw ship power and generate heat and an electromagnetic signature that enemy EW can detect. Hard Light shields add HP but generate more heat. Second Skin shields draw more power. (A power-triangle page 404'd; the "power triangle" is from memory, not read.)

(d) Ammo vs energy. Ballistic weapons use ammo and no power. Smaller ships reload from magazines. Larger ships feed from an internal buffer fed by cargo. Energy weapons are easy to supply.

(e) Range, speed, rate. Ballistic shots are slower but keep effectiveness at range. Repeaters and gatlings have high rate and low damage per hit. Cannons are medium. Scatterguns have low rate, high damage and conical spread. Mass drivers have low rate and high damage. Neutron weapons have high damage and very short range. Tachyon cannons have extreme velocity and range. Rapid-fire ballistics suit point defence against missiles and torpedoes. Weapons are size-standardised, so one size class swaps across hardpoints.

(f) Area damage. Missile payloads include high explosive, EMP and cluster munitions. Some shield variants are tuned to splash damage.

(g) Disabling. Distortion is the explicit non-lethal disabler, built to disable ships without destroying them. EMP missile payloads exist.

(h) Shield variants. A ship runs two generators at once and extras act as backups. Classes:
- competition: fast regen and reboot, low max;
- military: strong, slower reboot;
- industrial: biggest pool, slow regen and reboot;
- stealth: lowest pool and regen, fastest reboot;
- civilian: average.
Grades A to D (A best). Variants: Rapid Charge (strength for recharge speed), Durable Item (HP at the cost of a larger signature), Direct Damage Shell, Splash Damage Guard, Second Skin, Hard Light, Phalanx (limited-arc point-defence shield with full ballistic absorption). Layouts include single bubble, front/back and quadrant.

(i) Drones. Not covered.

(j) Upgrades. Component size slots, A to D grades, shield classes and variants, hardpoint sizes and missile rack sizing (a size-4 rack holds two size-3 missiles).

Source: https://starcitizen.tools/Ship_weapon (read 2026-10-18)
Source: https://starcitizen.tools/Shield_generator (read 2026-10-18)
Source: https://starcitizen.tools/Missile (read 2026-10-18)

---

## 5. FreeSpace 2

The hard-light.net wiki returned 403 on every page. This section uses Wikipedia plus search-result summaries of the hard-light wiki (flagged; not cited).

(a) Damage vs shields and hull. Shields must be shot down before hull damage lands. Shields recharge but hull damage is permanent (Wikipedia). Search snippet only: the Subach HL-7 (900 m, 5 shots/s) is described as superb against shields. Flak is described as negligible against shielded targets but dangerous once any quadrant is breached.

(b) Lock-on and countermeasures. The HUD warns on missile lock and shows threat direction, so the player decides when to deploy countermeasures or evade (Wikipedia). Search snippet only: countermeasures are rear-ejected decoys against heat and aspect seekers, with about thirty carried. Flak can prevent aspect lock for torpedoes in first-person view, and EMP shuts down enemy missile guidance. (from memory, not read: countermeasure success is a probability roll and aspect locks take time to build.)

(c) Energy. Power is rerouted among engines, weapons and shields (the energy transfer system), which speeds one at the cost of the others. It is optional (Wikipedia).

(d) Ammo vs energy. Wikipedia says weapons are primary or secondary. (from memory, not read: primaries draw weapon energy, secondaries are limited-stock missiles.)

(e) Range, speed, rate. Search snippet only: standard flak has the highest rate and shortest range, long-range flak the longest range and least damage, heavy flak the highest damage and largest shockwave at the slowest rate.

(f) Area damage. Wikipedia mentions battlefields crowded with beams, missiles and flak. Search snippet only: flak has a shockwave radius, and EMP Adv has about a 300 m shockwave.

(g) Disabling. Search snippet only: the EMP Adv scrambles sensors and comms, shuts down bombs and turrets temporarily, and stops warheads in flight. Turrets on capital ships can be destroyed independently as subsystems and targeted with a key press. Beam cannons are mounted on large vessels as anti-capital and point-defence weapons. Wikipedia itself does not describe subsystem targeting.

(h) Shield variants. Not covered. (from memory, not read: shields are split into quadrants, which the snippet's "breached quadrant" line supports.)

(i) Drones. Not covered.

(j) Upgrades. Campaign unlocks ships and weapons; some missions force loadouts (Wikipedia).

Source: https://en.wikipedia.org/wiki/FreeSpace_2 (read 2026-10-18)

---

## 6. Freelancer (2003)

(a) Damage. Not covered by pages read. A search snippet (fan wiki, not read) said EMP mines do large shield damage and little hull damage.

(b) Lock-on and countermeasures. Forum players say cruise disruptors travel like bullets, not missiles, so countermeasures must be dropped as soon as the warning sounds. Disruptors have a large blast radius, so timing matters. An advanced dropper on autofire is recommended against rear attackers. One poster claims about 90% success with an auto-dropper and maneuvering. Skilled pilots can kill the engine, turn and shoot the disruptor down. Reported disruptor speeds are about 700 m/s (Wasp) and 800 m/s (Hornet). NPCs reportedly do not fire disruptors at ships in engine-kill mode.

(c) Power. Not covered.

(d) Ammo vs energy. Not covered by pages read.

(e) Range, speed, rate. Forum: disruptors are small cruise engines with an EMP-type warhead.

(f) Area damage. A disruptor blast radius is large (forum).

(g) Disabling. The cruise disruptor stops a target from using its cruise drive. This is the signature disabler (forum, plus a search snippet saying it does little damage).

(h) Shields. Loot from tractor beaming wrecks includes shield batteries and nanobots, which are consumable repair items (forum). A forum post shows a player with 26 nanobots and 26 shield repairs used while attacking shield generators in a mission (search snippet only).

(i) Drones. Not covered.

(j) Upgrades. Wikipedia says the main goal is earning money for better weapons and equipment. Advanced ships and weapons unlock through the story. Faction standing changes with kills. Equipment is swapped while landed (forum).

Source: https://en.wikipedia.org/wiki/Freelancer_(video_game) (read 2026-10-18)
Source: https://lancersreactor.com/viewtopic.php_f=16_t=24009 (read 2026-10-18)
Source: https://forums.anandtech.com/threads/freelancer-how-to-mount-equipment-to-your-ship.1041427/post-7386457 (read 2026-10-18)

---

## 7. FTL: Faster Than Light

All from Wikipedia and player threads; the wiki was blocked. These are opinion, not specs, and no pages gave exact numbers except where noted.

(a) Damage. Hits can disable systems until repaired, breach hulls so air vents, start fires, or reduce hull. A ship dies at zero hull or when the crew is gone (Wikipedia).

(b) Lock-on and countermeasures. Missiles can miss. Defense drones intercept them. Bombs ignore defense drones but can be dodged (forum). Hacking the enemy pilot system can ensure hits.

(c) Power. Weapons draw reactor power and have charge times. Examples from a thread: Heavy Laser and Ion Blast cost 1 power, and a Burst Laser Mk3 is very power-hungry. Charge Laser II fires a shot about every 5 s. A weapon preigniter accessory shortens the first charge. Power can be diverted from nonessential systems.

(d) Ammo vs energy. Missiles and bombs use limited ammo. Lasers, ion and beams use power only. (the missile ammo limit is from memory, not read.)

(e) Range, speed, rate. Ion shots are slow, so players cut shield power just before impact and restore it after. Matching charge times matters when volleying.

(f) Area damage. Beams hit multiple tiles and need support from other weapons. Fire beams ignite many tiles. Breach bombs open hull breaches.

(g) Disabling. Ion weapons stack ion damage on shields, which refreshes if hits land often enough (a forum says every 5 s). Hacking disables a system temporarily and drains air. Breach and ion weapons strip shields fast. Teleporter boarding pairs with ion. Advanced Edition adds mind control. Wikipedia notes hacking drones target specific systems.

(h) Shields. They are layered and recharge quickly, so players fire shield-penetrating weapons in a cluster (stacking fire orders) to break through. Super shields need a bomb plus raw firepower.

(i) Drones. Combat and support drones are equipment (Wikipedia). Anti-ship drones need no charge-up, so players keep them off until shields drop. Defense drones are toggled on when missiles are fired. Early drones can help against boarders and fires.

(j) Upgrades. Scrap buys system upgrades and weapons in shops. Weapons come in Mk1 to Mk3 / I to III tiers. Ship augmentations exist. Players advise upgrading shields and engines early.

Source: https://en.wikipedia.org/wiki/FTL:_Faster_Than_Light (read 2026-10-18)
Source: https://steamcommunity.com/app/212680/discussions/0/35222218708112006 (read 2026-10-18)
Source: https://steamcommunity.com/app/212680/discussions/0/135509823661095758 (read 2026-10-18)

---

## 8. Everspace (1) and Everspace 2

(a) Damage vs shields and hull. Everspace 1 developer advice: use the pulse laser to strip shields, then the gatling gun for hull; missiles work best once shields are down, and one light missile can kill a standard fighter (Xbox dev tips). A 2016 community thread said coil guns are strong against shields. Everspace 2 players say thermo guns for shields, flak and autocannons for armour, and mines for armour, with shields and armour both able to regenerate mid-fight.

(b) Countermeasures. A thread notes an anti-missile device for defence. A search snippet (not read) said mines cannot be shot down by anti-missile drones.

(c) Energy. All shooting, devices and boost drain the energy core. Never start a fight low, and hide and stand still to recharge (dev tips). Each weapon draws from its own energy pool in Everspace 2 (thread). Boost energy is conserved by drifting.

(d) Ammo vs energy. Search snippet only: Everspace 2 primaries have unlimited ammo but cost energy, and secondaries have limited ammo. The thread confirms rockets and missiles as secondaries. The Everspace 1 thread notes the Daredevil subroutine makes weapons free of energy cost at +25% damage but removes the shield. Missiles can be crafted mid-fight if resources allow.

(e) Range, speed, rate. Flak is good against swarms but has a wide bloom. Coil guns are instant-hit. Shock rifles are long-range sniping. Fusion cannons are close range. Gatling guns are for sustained hull damage. A 2016 thread says missiles come in light, shield-breaker and stasis types.

(f) Area damage. Flak bursts near enemies. Cluster mines punish moving targets. The Energy Discharger gives area damage with a full energy bar. Everspace 2 EMP and virus devices control groups.

(g) Disabling. Stasis missiles, EMP and the Annihilator Virus stun or disable large targets. The Mainframe subroutine takes over an enemy ship.

(h) Shields. The Front Shield Projector is a directional shield for builds lacking one. Shield recovery during fights is noted for Everspace 2.

(i) Drones. Dev tips: target enemy drones first, because they hit hard with few HP. Everspace 2 carriers launch armoured, sniper, webber and detonator drones, and players clear snipers and armoured ones first. Wikipedia's Everspace article did not mention drones.

(j) Upgrades. Everspace 1 is a roguelike: credits earned before dying buy permanent perks; blueprints persist; shields, energy core and hull are prioritised; extra weapon and equipment slots matter most mid-game. Everspace 2 uses gear stats (firepower, resistance, expertise), rarity upgrades, disassembly for crafting, and ship-specific perks.

Source: https://en.wikipedia.org/wiki/Everspace (read 2026-10-18)
Source: https://en.wikipedia.org/wiki/Everspace_2 (read 2026-10-18)
Source: https://news.xbox.com/en-us/2016/11/22/everspace-developer-tips-strategies/ (read 2026-10-18)
Source: https://steamcommunity.com/app/396750/discussions/0/343787283754551640 (read 2026-10-18)
Source: https://steamcommunity.com/app/1128920/discussions/0/3383904768767185664 (read 2026-10-18)

---

## 9. Physics and real-world sources

### 9a. Kinetic and railguns
- Railgun muzzle velocity can exceed about 3 km/s; chemical guns top out near 2 km/s. Military goals were 2 to 3.5 km/s and 5 to 50 MJ muzzle energy. Energy scales with v squared. A 33 MJ shot was demonstrated in 2010.
- Launch currents reach millions of amps for milliseconds. Power is stored in capacitors or compulsators. A 32 MJ shot at 10 per minute needs about 25 MW, versus about 9 MW spare on destroyers.
- Rail erosion and arcing are the barrel-life limit (reports of only a couple dozen full-power shots in some cases).
- Projectile hitting a target: a kinetic mass of about 100 kg or more is nearly as lethal as a same-mass nuclear warhead (Atomic Rockets). A 1 g projectile at 32 km/s carries about 1 MJ.
- Armour: whipple shields (thin bumper plus vacuum gap) can match a solid barrier 10 to 20 times heavier against orbital-debris-speed impacts. Best when areal density is about a quarter of the projectile's. Anti-spall liners catch fragments.
- Game relevance: ammo/energy split, charge-up capacitor, wear/heat on the gun, and shield-piercing kinetic.

### 9b. Lasers and directed energy
- Laser shot energy for penetrating armour: about 148 kJ for a 1 cm2 spot versus about 15 MJ for a 10 cm2 spot (Atomic Rockets). Drilling is limited to about 1 m/s.
- Ablative layers raise needed fluence from about 10 kJ/cm2 to 20 to 30 kJ/cm2 for an ICBM-class target, and spin roughly triples it.
- Thermal blooming and beam spreading cut delivered energy. Wikipedia places the topic under particle beams, and says range is limited mainly by beam spreading.
- Real power numbers: DragonFire class about 50 kW; cost per shot reported at about $1 for a US Navy laser.
- Microwave weapons: one prototype is 450 MW peak, 20 ns pulses, disabling small drones at up to 1 km (goal 5 km).
- Game relevance: dwell time, heat spread, ablative or reflective counters, cheap shots.

### 9c. Particle beams
- Charged beams repel and spread, and the Earth's magnetic field bends them. Neutral beams (negative hydrogen ions accelerated to 100 to 1000+ MeV, then neutralised) hold focus. A beam may carry over a gigajoule of kinetic energy.
- Effects: near-instant surface superheating, and deeper ionisation that upsets or destroys electronics.
- In 1984 hardening a target was considered impractical against such a beam (Wikipedia, as stated). Accelerators must be lightweight for space.

### 9d. EMP
- Pulses cause noise, temporary malfunction, or permanent damage by induced current; data on magnetic media can be corrupted.
- Atomic Rockets: E-bombs have short range (hundreds of metres, inverse-square), need large power sources, and are countered by Faraday cages. Vacuum tubes are tougher than transistors; fibre is immune but fragile.
- Game relevance: short-range, shield-ignoring system disruption that is hardened away on tough ships.

### 9e. Missile countermeasures
- Chaff: clouds of thin metal-coated strips cut to about half the radar wavelength create false radar returns. Modern fibre is about 0.025 mm thick and 7.6 to 51 mm long, with 3 to 5 million fibres per cartridge. Doppler filters beat it because chaff slows fast, so aircraft turn across the radar line of sight and jammers can paint chaff clouds to fake velocity.
- Flares: burn hotter than the engine so IR seekers lock on them. Tactics are releasing flares, turning hard and cutting engine power; pre-flaring can distort what the seeker expects. Counter-countermeasures include spectral discrimination, trajectory analysis, size estimation, and dual IR/UV seekers.
- Atomic Rockets: defensive options include jamming homing frequencies, signature reduction, random "drunkwalk" evasion (the pattern must stay secret), phased-array laser point defence, kinetic barriers, defence drones as sacrificial interceptors. Small decoy missiles are called cost-ineffective; changing a full ship's signature is suggested. Light lag means hit chance depends on cross section, acceleration and range.

Source: https://en.wikipedia.org/wiki/Railgun (read 2026-10-18)
Source: https://projectrho.com/public_html/rocket/spacegunconvent.php (read 2026-10-18)
Source: https://projectrho.com/public_html/rocket/spacegunexotic.php (read 2026-10-18)
Source: https://projectrho.com/public_html/rocket/spacewardefense.php (read 2026-10-18)
Source: https://en.wikipedia.org/wiki/Particle-beam_weapon (read 2026-10-18)
Source: https://en.wikipedia.org/wiki/Directed-energy_weapon (read 2026-10-18)
Source: https://en.wikipedia.org/wiki/Electromagnetic_pulse (read 2026-10-18)
Source: https://en.wikipedia.org/wiki/Chaff_(countermeasure) (read 2026-10-18)
Source: https://en.wikipedia.org/wiki/Flare_(countermeasure) (read 2026-10-18)

(The Atomic Rockets pages are huge; only the first ~100,000 characters of each were read.)

---

## Cross-cutting mechanics that make combat interesting

- **Rock-paper-scissors damage vs layers.** Shield-killer damage and hull-killer damage are different, so players swap loadout mid-fight. Sources: Elite (thermal vs kinetic/explosive, incendiary vs corrosive rounds), EVE (four damage types and per-faction NPC mixes), Everspace (pulse laser then gatling), Star Citizen (energy vs ballistic bypass), X4 (ion weapons shield-heavy), FreeSpace (HL-7 vs shields).
- **Partial shield bypass.** A fraction of kinetic damage ignores shields, so shields never fully protect. Sources: Star Citizen (about 20 to 60% bypass), Elite (railguns and penetrating rounds), Railgun physics (kinetic delivers energy regardless).
- **Capacitor and heat as the real ammo.** A recharge curve with a sweet spot, plus a shutdown on overheat, makes firing a decision. Sources: EVE (cap recharge fastest near 25%), Elite (rails drain the weapons capacitor), X4 (overheated weapon cut out), Everspace (shooting, devices and boost share one energy core), Star Citizen (energy weapons add heat and signature), FreeSpace (power rerouting).
- **Split ammo vs energy economy.** Free-but-hot primaries plus scarce explosive secondaries give a rhythm of sustained fire and finishers. Sources: Star Citizen (ballistic = ammo, energy = power), Everspace 2 (primaries cost energy, secondaries limited), FTL (missiles vs lasers), EVE (turret charges vs missile ammo).
- **Missiles as a delayed, avoidable threat with a counter.** Warning, countermeasure window, then a hit-or-dodge. Sources: Freelancer (drop countermeasures at the warning), FreeSpace (HUD lock warning, flares), X4 (limited flares), Star Citizen (IR/EM/CS seekers each have a different counter, and the real flare/chaff pages show counter-countermeasures), EVE (fast ships outrun missiles, guidance disruption, defenders).
- **Different seeker types so one countermeasure is not universal.** Flares for heat, chaff for radar, nothing for visual. Sources: Star Citizen, Flare and Chaff pages.
- **Point defence as a role.** Beams and rapid-fire guns kill incoming missiles, giving escorts a job. Sources: X4 (beam turrets), Star Citizen (rapid ballistics, Phalanx shield), FTL (defense drones), FreeSpace (beam cannons, flak), Everspace (flak against drones), Atomic Rockets (laser grid, sacrificial drones).
- **Disabling instead of destroying.** Distortion, ion, EMP, cruise disruptors and system hacks shut things off so the target can be captured, looted or left helpless. Sources: Star Citizen (distortion), FTL (ion, hacking), FreeSpace (EMP), Freelancer (cruise disruptor, EMP mines), Everspace 2 (EMP, virus), X4 (boarding).
- **Subsystem and module hits.** Aim at turrets, engines, power plants or modules rather than the total hull. Sources: Elite (internal module damage), FreeSpace (turret subsystems), X4 (fighters strip turrets and engines), FTL (system damage and breaches).
- **Electronic warfare that changes the numbers rather than health.** Range, lock, tracking and signature debuffs, each with an equipment counter. Sources: EVE (ECM, damps, tracking disruptors, painters, ECCM), Star Citizen (EM signature and detection), real-world chaff and jamming.
- **Area damage that rewards bunching or punishes it.** Flak shockwaves, mines, smartbombs and splash. Sources: FreeSpace (flak, EMP shockwave), EVE (smartbombs, explosion radius), X4 (mines, missile AoE), Everspace (cluster mines, discharger).
- **Shield variants as playstyle choices.** Big slow shields with a heal item, versus small fast shields. Sources: Elite (prismatic vs bi-weave plus cell banks), Star Citizen (classes and variants, reboot time), X4 (small shields with recharge delay versus large with none), Everspace (front projector, Daredevil trade-off).
- **Drones as an economy of attention.** Limited bandwidth or power, high-value-low-HP targets, and a clear first-kill priority. Sources: EVE (bandwidth, control range, sentries, logistics), X4 (deployed defence drones), FTL (power-gated drone types), Everspace (kill drones first).
- **Upgrades as sidegrades with trade-offs, not just numbers.** Tiers with a cost in power, heat, size or signature. Sources: EVE (rigs, skills, CPU/PG, stacking), Star Citizen (grade A to D and variants), Everspace (Daredevil), FTL (preigniter), Elite (ammo types).
- **Real physics offers hard limits to borrow.** Rail energy scales with v squared and eats barrels, lasers need dwell time and ablate away, particle beams spread unless neutral, EMP is short-range and hardenable, and light lag lets evasion beat guided shots. Sources: Railgun, Atomic Rockets, Directed-energy, Particle-beam, EMP pages.
