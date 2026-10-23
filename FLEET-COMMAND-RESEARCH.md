# Fleet command research: how games let players command ships and fleets

For: space combat game where the player flies one ship and commands capital ships, cruisers and fighters.
All sources were read on 2026-10-18. Anything marked **(unverified)** comes from general knowledge and was not confirmed on a page I fetched. Fetch failures are listed at the end.

---

## 1. Homeworld (Remastered / HW3)

- **Order vocabulary:** move, attack, guard, dock, plus formations and tactics. Remastered 2.0 splits "tactics" in two. Rules of engagement say whether ships shoot: fire at anything in range, return fire, or hold fire. Stances set how they fight: Aggressive, Normal, Evasive. Aggressive ships fight closer and keep formation. Evasive ships break formation and dodge, which suits harassment and delaying actions (from search-result summaries of the Gearbox 2.0 update notes; the Gearbox page itself returned 403, see below).
- **Formations:** a walkthrough recommends Sphere for guarding a unit, Claw for picking enemies off one at a time, and X for moving light craft. It also advises Evasive while moving and Aggressive while attacking ([Homeworld walkthrough, StrategyGamers](https://strategygamers.com/walkthrough/homeworld-remastered-collection-3)). Players on Steam say formations work best one per ship-type group: X for fighters, V for bombers, Wall for corvettes. Their complaint is mixed-type formations: frigates drifted to the front and died while battlecruisers hung back, and delta formations fell apart on contact ([Steam: HWR formations thread](https://steamcommunity.com/app/244160/discussions/0/1693785035805155936)).
- **How orders are given:** select, then context click or hotkey. Control groups are essential. The walkthrough tells you to pause often to reselect targets and re-issue attacks ([StrategyGamers](https://strategygamers.com/walkthrough/homeworld-remastered-collection-3)).
- **Sensors Manager / time:** a zoomed-out tactical map for long-range plotting, scouting and finding threats. Pausing on it is standard play. A period review praised how smoothly the camera moves between the close-up view and the map view. It also found the 3D movement disc hard to learn without the tutorial ([Shacknews](https://www.shacknews.com/article/1480/homeworld-good)). Vertical moves are done by holding Shift while placing the move disc **(unverified)**.
- **Satisfying:** a formation of scouts wrapping around an enemy's line looks and feels right. **Fiddly:** formations break in combat, mixed groups do odd things, and learning 3D movement is slow.

## 2. Sins of a Solar Empire (I and II)

- **Vocabulary:** move, attack, stop and hold position. Sins II adds an engagement range per fleet with three settings: hold position, nearby area, or anywhere in the gravity well. Ships added to a fleet inherit the setting, and II also adds narrow and wide formations (search summary of the Vasari Rebels changelog; the forum page itself returned 403).
- **Autocast:** each ability can be set to autocast, and the AI then fires it when its conditions are met. Players call auto-target and autocast "serviceable." Their view is that casting capital-ship abilities by hand gets much more value ([Steam: Sins II fleet behaviour thread](https://steamcommunity.com/app/1575940/discussions/1/4633736682039958065)).
- **Smart targeting from the fleet panel:** right-clicking an enemy ship *type* in the fleet list spreads fire across that type so ships don't overkill. Alt-right-click makes them focus that type one ship at a time. If a manual target dies, ships go back to firing at will. A fleet option lets ships jump to hyperspace only while in formation, so they arrive together ([same thread](https://steamcommunity.com/app/1575940/discussions/1/4633736682039958065)).
- **Strike craft:** carriers and capital ships launch squadrons on their own, and squadron counts grow with level. Players put bombers in their own control group so they can focus fire (search summaries; StrategyWiki and fandom pages blocked).
- **Lesson:** automation is the default, and manual play is a skill ceiling on top of it. Ordering by enemy class is a clever high-level verb.

## 3. X4: Foundations

- **Vocabulary:** a hierarchy. You assign a ship to a commander, then choose a role: Attack with Commander, Intercept for Commander (S/M targets), Bombard for Commander (L/XL), Defend, or Defend Position (a carrier's wings each guard a dragged marker). Defend Position groups have toggles for attack on sight versus wait to be attacked, resupply at carrier, and reinforce other positions ([X4 wiki: Attack with Commander](https://wiki.egosoft.com/X4%20Foundations%20Wiki/Manual%20and%20Guides/Objects%20in%20the%20Game%20Universe/Orders%2C%20Behaviours%20and%20Assignments/Attack%20with%20Commander%20%28Assignment%29/); [Intercept/Bombard](https://wiki.egosoft.com/X4%20Foundations%20Wiki/Manual%20and%20Guides/Objects%20in%20the%20Game%20Universe/Orders%2C%20Behaviours%20and%20Assignments/InterceptBombard%20for%20Commander%20%28Assignment%29/); [Defend Position](https://wiki.egosoft.com/X4%20Foundations%20Wiki/Manual%20and%20Guides/Objects%20in%20the%20Game%20Universe/Orders%2C%20Behaviours%20and%20Assignments/Defend%20Position%20%28Assignment%29/)).
- **How orders are given:** select ships on the map, right-click the commander, then pick from a cascading menu. Subordinates fall back to a default behaviour once orders finish.
- **Behaviour details:** Attack subordinates only hit the commander's target, even a bad one. Intercept and Bombard ships pick their own targets within 40 km, but only in their size class, and they never switch class even when nothing in it is left ([wiki](https://wiki.egosoft.com/X4%20Foundations%20Wiki/Manual%20and%20Guides/Objects%20in%20the%20Game%20Universe/Orders%2C%20Behaviours%20and%20Assignments/InterceptBombard%20for%20Commander%20%28Assignment%29/)).
- **What players say:** "Attack" seemed to do nothing unless the leader was firing. Escorts on "Defend" flew out of turret cover. The in-game help and developer explanations contradict each other. Players have to recall subordinates to clear stale queued orders ([Steam: X4 subordinate thread](https://steamcommunity.com/app/392160/discussions/0/2253433385446311456)).
- **Lesson:** the role system (escort / intercept small / bombard big) is a strong idea when the player's ship is the commander. The fiddliness comes from opaque rules and leftover order queues.

## 4. EVE Online (human fleets, but the best-tested command language)

- **Vocabulary:** Primary / Secondary (focus-fire order), Anchor (orbit the FC or a named anchor at a set range), Align (point at a warp destination so the fleet warps together), Hold, Cycle guns (stop firing to prepare a switch), broadcasts for shield/armour/hull repairs ([Brave fleet basics](https://wiki.bravecollective.com/public/dojo/wiki/fleet-basics); [EVE Uni brevity codes](https://wiki.eveuniversity.org/Brevity_codes)).
- **How orders are given:** voice for the FC, plus broadcast buttons in the fleet window that pop up as clickable items for everyone. Pilots in danger broadcast for shields *before* taking damage so logistics can lock them early ([Brave](https://wiki.bravecollective.com/public/dojo/wiki/fleet-basics)).
- **Doctrine:** a fleet flies set ship fits, so the FC knows its damage and range in advance. Target priority is a doctrine of its own: jammers first, then tacklers, then fragile damage dealers. Switch if the primary isn't dying or logistics out-heal you, and avoid obvious bait ([Ten Ton Hammer: calling targets](https://www.tentonhammer.com/eve/guides/combat/calling_targets)).
- **Brevity:** when comms get crowded the FC calls "Brevity," and short code words replace sentences ([EVE Uni](https://wiki.eveuniversity.org/Brevity_codes)).
- **Lesson:** a tiny shared vocabulary (primary, anchor, align, broadcast) runs fleets of hundreds. Focus fire beats spread damage because spread damage gives enemy healers time to react.

## 5. Battlefleet Gothic: Armada

- **Time control:** the spacebar slows the game to a crawl ("Tactical Cogitator") so you can plan and give orders. A reviewer notes it is technically slow motion, not a pause, and that it is needed to issue orders at all ([GamePressure review](https://www.gamepressure.com/e.asp?ID=681); [BFGA shortcuts](https://www.magicgameworld.com/?p=28659)).
- **Vocabulary (from the key list):** movement verbs All Ahead Full, High Energy Turn, Burn Retros. Behaviour settings: Auto Engagement, engagement position, engagement distance (3/6/9/12k), broadside side (closest/left/right), Hold Fire, focus on target while moving. Special orders: Reload, Lock On, Brace for Impact, Running Silent. Strike craft (bombers, assault boats, fighters) each have their own key ([shortcuts](https://www.magicgameworld.com/?p=28659)).
- **Angle of approach:** weapons and armour depend on facing. Imperial ships rely on broadsides, and a battleship can be beaten by fast ships that stay out of its fire arcs ([GamePressure](https://www.gamepressure.com/e.asp?ID=681)). Big ships turn slowly, so forcing them into turns is the play ([CGMagazine review](https://www.cgmagonline.com/review/game/battlefleet-gothic-armada-review)).
- **Feedback / crew:** captains have morale, and Ork captains in particular may disobey ([CGM](https://www.cgmagonline.com/review/game/battlefleet-gothic-armada-review)).
- **Satisfying:** deep positional play, and a strong sense of victory. **Fiddly:** players bounce between the orders menu and the battlefield until they know the hotkeys, and a reviewer wanted a compact context menu next to the ship ([GamePressure](https://www.gamepressure.com/e.asp?ID=681)). Opening volleys can decide the fight ([CGM](https://www.cgmagonline.com/review/game/battlefleet-gothic-armada-review)).
- **Lesson:** stance settings like "keep 6k, broadside left" let the AI fly the ship while the player chooses geometry. Slow motion is better than a hard pause for keeping tension.

## 6. FreeSpace 2

- **How orders are given:** the comms menu opens with C, then Wings is option 2 (and Ships / All Fighters / Reinforcements / Rearm sit alongside it). It is a numbered tree you drive with the number keys while flying (search summary of the hard-light wiki, which returned 403).
- **Vocabulary:** attack or defend a specific target, attack any enemy, guard the player, and Form on my Wing (drop everything, fly to the player, stay close). Guard means circle a chosen ship ([FreeSpace Port dev log 11](https://www.nomadsreviews.co.uk/post/freespace-port-recharged-dev-log-11-rally-points)). The full menu also has Destroy / Disable / Disarm my target, Destroy subsystem, Protect my target, Ignore my target, Cover me, Engage enemy, Depart **(unverified)**. "Cover me" means peel off enemies attacking the player (search snippet of an open-source X-Wing-engine issue list; page needed login).
- **Feedback:** wingmen acknowledge by radio with talking heads, and wingman status sits on the HUD.
- **Criticism:** the wingmate AI is weak. Wingmen fly into point-defence fire and collide with things, and there is no "go to this empty point" order, so a modder faked rally points out of invisible craft ([dev log](https://www.nomadsreviews.co.uk/post/freespace-port-recharged-dev-log-11-rally-points)). Reviewers judged the dogfight AI adequate but crash-prone ([Wikipedia: FreeSpace 2](https://en.wikipedia.org/wiki/FreeSpace_2)).
- **Lesson:** "my target" verbs are perfect for a pilot-commander. You point at something with your own ship, then press one key.

## 7. Star Wars: Squadrons

- **How orders are given:** one button, ping. With an enemy selected, ping marks it for allies to attack. With an ally selected, ping marks it for allies to defend. Double-tap acknowledges a teammate's ping and makes it your own target ([Squadrons ping guide](https://www.magicgameworld.com/?p=125165)). Double-tapping target-cycle selects whoever is shooting you ([Steam: Squadrons targeting thread](https://steamcommunity.com/app/1222730/discussions/0/3013431044284408309)).
- **Flagship:** Fleet Battles end when the enemy flagship falls. You first win the dogfight, then kill escorting capital ships, then the flagship ([Press Start review](https://press-start.com.au/reviews/pc-reviews/2020/10/01/star-wars-squadrons-review-be-my-wingman/)). Players must target cruiser sections and then switch to defence ([Den of Geek review](https://www.denofgeek.com/?p=621905)).
- **Wingmen:** campaign wingmen (four per side) are mostly hangar conversation. No reviewer I read described a wingman order set ([Seasoned Gaming](https://seasonedgaming.com/2020/10/12/review-star-wars-squadrons-cover-me-porkins/)). One review noted that cockpit functions spill into radial menus because there aren't enough buttons ([same](https://seasonedgaming.com/2020/10/12/review-star-wars-squadrons-cover-me-porkins/)).
- **Lesson:** a context-sensitive single button (enemy = attack, friend = defend) covers most of what a fighter pilot needs.

## 8. Everspace 2

- **Wingmen:** one companion, Elek, can join fights. Perks raise his chance of showing up and his gear. There is no order system. A developer said the game is about a lone pilot in an arcade shooter and a squad system isn't planned ([devtrackers: ES2 dev reply](https://devtrackers.gg/everspace-2/p/36b70923-new-content-questions)).
- **Lesson:** an ally with no commands works as a bonus surprise, not as a fleet. It also shows the cost: squad AI and its UI are a big job.

## 9. Mount & Blade II: Bannerlord

- **How orders are given:** number keys pick a group (1-8, 0 for all), then F-keys open an order category, then a second F-key picks the order. F1 Movement: To Position, Follow Me, Charge, Advance, Fallback, Stop, Retreat. F2 Facing. F3 Formations: Line, Shield Wall, Loose, Circle, Square, Skein, Column, Scatter. F4 toggles Fire at Will / Hold Fire. F6 hands a group to an AI sergeant ([GamerGuides tactics](https://gamerguides.com/mount-and-blade-ii-bannerlord/guide/introduction/useful-gameplay-tips/tactics)).
- **Time:** none. You give orders while fighting in real time.
- **Default groups by type:** infantry, ranged, cavalry and horse archers each start in their own group.
- **Lesson:** default groups by role, plus a two-key grammar (who, then what), make ordering while fighting possible. "Delegate to AI" is a first-class order.

## 10. FTL: Faster Than Light

- **Time:** combat is real time, but you can pause at any moment to assess and give orders, so pausing is the core of play ([Wikipedia: FTL](https://en.wikipedia.org/wiki/FTL:_Faster_Than_Light)). A reviewer called combat surprisingly frantic and said the pause gives breathing space to aim weapons and move crew ([Expert Reviews](https://www.expertreviews.co.uk/games/pc-games/52216/ftl-faster-than-light-review)).
- **Vocabulary:** route power, send crew to a room, target a weapon at an enemy room, jump. Few verbs, each with an obvious result.
- **Lesson:** a small verb set plus a free pause makes triage tense but never fiddly. Hits that knock out systems give instant, readable feedback.

## 11. Elite Dangerous: ship-launched fighters and NPC crew (extra)

- **Setup:** a fighter bay, fighters, and hired NPC crew. While you fly the fighter, the crew flies the mothership, which takes simple orders. Only one NPC fighter can be out at a time (search summaries of the 2.2 patch notes; Frontier pages returned 403).
- **Vocabulary:** players describe three top-level modes. Defend shoots whatever shoots you. Engage at Will attacks any hostile. Hold Fire keeps formation and holds fire. On top of those sit "attack my target," a formation order, and Recall, each bindable to a key ([ElitePVE thread](https://www.elitepve.com/viewtopic.php?p=90972)). The full panel also lists Follow and Hold Position **(unverified)**, and the official page says the mothership can hold position or follow you (search snippet only).
- **What players say:** Engage at Will sends the fighter straight into the largest group of enemies. Experienced players leave it on Hold Fire, give it one target, then reset it. A player whose fighter used to last under a minute stopped losing them with this method ([ElitePVE](https://www.elitepve.com/viewtopic.php?p=90972)). Losing the NPC pilot permanently makes players cautious.

---

## Synthesis: 14 design lessons for satisfying command

1. **Keep the core vocabulary to about 6 verbs.** Attack my target, Defend (me or my target), Engage at will, Hold / Form on me, Move there, Recall. EVE runs huge fleets on primary/anchor/align, and FTL on a handful of verbs. X4's many overlapping roles are its biggest complaint.
2. **Make "my target" the main grammar.** The player's ship is the pointer: lock something, press one key (FreeSpace, Elite, Squadrons ping). Use one context-sensitive key, where enemy means attack and friend means protect, as in Squadrons.
3. **Separate rules of engagement from stance.** Whether to shoot (free / return fire / hold fire) is one setting, and how to fight (aggressive / normal / evasive or a range band) is another. Homeworld and BFGA both do this, and it keeps each menu tiny.
4. **Use standing behaviour, not orders that run out.** Ships should keep doing something sensible when an order completes or the target dies: go back to their role, or return to engage-at-will. X4 players struggle with leftover queues and silent defaults. Show the current behaviour on every ship card.
5. **Assign roles by class for fighters.** Interceptors hit small craft, bombers hit big ships, escorts stay near the commander (X4 Intercept/Bombard, Sins bombers in their own group). Let the player pick a role once and leave it, but let a role fall back to "anything" when its class is gone, which X4 doesn't do.
6. **Give capital ships geometry, not micromanagement.** Orders like "hold 6 km, broadside left, focus this" (BFGA) let the AI fly a slow ship while the player chooses the angle. Make facing matter so those choices count.
7. **Slow time instead of pausing in the tactical view.** BFGA's slow motion keeps tension, and FTL's full pause suits triage. For a flight game, a tactical overlay at around 20% speed (optional full pause on easy) lets the player think without leaving the cockpit fantasy.
8. **Keep a map-like tactical view that is one keypress away and moves smoothly.** Homeworld's camera move into the Sensors Manager was praised. Players lose track of where they are when the jump between views is abrupt.
9. **Default groups by type, plus two-key orders.** Bannerlord's "who, then what" on the number keys and F-keys works while fighting with your other hand. Suggested groups: All, Capitals, Cruisers, Fighters.
10. **Include "delegate" as an order.** Bannerlord's sergeant and Sins autocast let the player hand off whole groups. Automation should be competent by default and beatable by hand (Sins players say manual casting is worth it, but autocast is fine).
11. **Allow focus fire by type or ship.** Sins' "spread across this ship type" versus "one at a time" and EVE's primary calls show focus fire is the most valuable order. Make it one click from the tactical view.
12. **Make obedience readable.** Every order needs a voice acknowledgement plus a world marker: a line from ship to target, or a ping icon. FreeSpace's radio acknowledgements and Squadrons' in-world ping icon do this. Silent non-compliance, like X4's Attack that does nothing, feels like bugs.
13. **Make the AI obedient, not clever.** Players forgive plain obedience but not suicide. FreeSpace wingmen flying into point defence and Elite's Engage at Will charging the biggest blob of red are the top complaints. Give AI self-preservation (avoid point-defence arcs, retreat at low hull) that runs even under aggressive orders.
14. **Recall and regroup must always work, and fast.** Elite players bind Recall. Form on my Wing is FreeSpace's panic button. A guaranteed "come back to me" makes players willing to commit their fleet.

---

## Pages read (all 2026-10-18)

- [Homeworld Remastered walkthrough, StrategyGamers](https://strategygamers.com/walkthrough/homeworld-remastered-collection-3)
- [Steam: Homeworld Remastered formations thread](https://steamcommunity.com/app/244160/discussions/0/1693785035805155936)
- [Shacknews: Homeworld good](https://www.shacknews.com/article/1480/homeworld-good)
- [Steam: Sins of a Solar Empire II fleet behaviour thread](https://steamcommunity.com/app/1575940/discussions/1/4633736682039958065)
- [X4 wiki: Attack with Commander](https://wiki.egosoft.com/X4%20Foundations%20Wiki/Manual%20and%20Guides/Objects%20in%20the%20Game%20Universe/Orders%2C%20Behaviours%20and%20Assignments/Attack%20with%20Commander%20%28Assignment%29/)
- [X4 wiki: Intercept/Bombard for Commander](https://wiki.egosoft.com/X4%20Foundations%20Wiki/Manual%20and%20Guides/Objects%20in%20the%20Game%20Universe/Orders%2C%20Behaviours%20and%20Assignments/InterceptBombard%20for%20Commander%20%28Assignment%29/)
- [X4 wiki: Defend Position](https://wiki.egosoft.com/X4%20Foundations%20Wiki/Manual%20and%20Guides/Objects%20in%20the%20Game%20Universe/Orders%2C%20Behaviours%20and%20Assignments/Defend%20Position%20%28Assignment%29/)
- [Steam: X4 subordinate orders thread](https://steamcommunity.com/app/392160/discussions/0/2253433385446311456)
- [Brave Collective: Fleet Basics](https://wiki.bravecollective.com/public/dojo/wiki/fleet-basics)
- [EVE University: Brevity codes](https://wiki.eveuniversity.org/Brevity_codes)
- [Ten Ton Hammer: Calling targets](https://www.tentonhammer.com/eve/guides/combat/calling_targets)
- [GamePressure: Battlefleet Gothic Armada review](https://www.gamepressure.com/e.asp?ID=681)
- [CGMagazine: Battlefleet Gothic Armada review](https://www.cgmagonline.com/review/game/battlefleet-gothic-armada-review)
- [Battlefleet Gothic Armada PC keyboard shortcuts](https://www.magicgameworld.com/?p=28659)
- [Steam store: Battlefleet Gothic Armada](https://store.steampowered.com/app/363680/Battlefleet_Gothic_Armada/) (little on command)
- [FreeSpace Port Recharged dev log 11: rally points](https://www.nomadsreviews.co.uk/post/freespace-port-recharged-dev-log-11-rally-points)
- [Wikipedia: FreeSpace 2](https://en.wikipedia.org/wiki/FreeSpace_2)
- [GOG forum: obscure FreeSpace 2 features](https://www.gog.com/forum/freespace_series/a_few_more_obscure_not_very_well_explained_features_of_freespace_2) (nothing on orders)
- [LP Archive: FreeSpace 2 update 4](https://lparchive.org/Freespace-2/Update%204) (nothing on orders)
- [Star Wars Squadrons: ping system](https://www.magicgameworld.com/?p=125165)
- [Steam: Squadrons targeting thread](https://steamcommunity.com/app/1222730/discussions/0/3013431044284408309)
- [Press Start: Squadrons review](https://press-start.com.au/reviews/pc-reviews/2020/10/01/star-wars-squadrons-review-be-my-wingman/)
- [Seasoned Gaming: Squadrons review](https://seasonedgaming.com/2020/10/12/review-star-wars-squadrons-cover-me-porkins/)
- [Den of Geek: Squadrons review](https://www.denofgeek.com/?p=621905)
- [devtrackers: Everspace 2 developer reply](https://devtrackers.gg/everspace-2/p/36b70923-new-content-questions)
- [GamerGuides: Bannerlord tactics](https://gamerguides.com/mount-and-blade-ii-bannerlord/guide/introduction/useful-gameplay-tips/tactics)
- [Wikipedia: FTL](https://en.wikipedia.org/wiki/FTL:_Faster_Than_Light)
- [Expert Reviews: FTL review](https://www.expertreviews.co.uk/games/pc-games/52216/ftl-faster-than-light-review)
- [ElitePVE: CZ and SLF wingmen thread](https://www.elitepve.com/viewtopic.php?p=90972)
- [Steam: X-Wing Alliance FAQ thread](https://steamcommunity.com/app/361670/discussions/0/144513128845482179) (no key list)

## Fetches that failed (not cited as read)

- Fandom wikis (Homeworld Formations, Sensors Manager, Elite Ship-Launched Fighter): HTTP 402.
- Hard-Light FreeSpace wiki (Tactical, Squadmates): 403.
- Frontier: Elite 2.2 news, community SLF page, forum threads: 403.
- PC Gamer reviews (BFGA, Squadrons): page came back with no review text.
- God is a Geek (BFGA), Epic Store HW3 guide, Gearbox HWR update notes, Sins II forums/changelog, StrategyWiki Sins II, Stardock wiki, TV Tropes Squad Controls, GameSkinny ES2 review, PC Invasion: 403, redirect or empty.
- Bitbucket XWVM wingman-orders issue: login required.
- Mount & Blade: no critique page read. Star Wars Rebellion: not researched. X-Wing Alliance: no wingman key list found.
