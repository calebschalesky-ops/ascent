/**
 * Phase A's skirmish (VISION §16): the player's Saturn house against a Jupiter house at Saturn's rings, 12 v 12.
 * ASSUMED, for Caleb to overrule: a fixed roster (rosterSeed), the fleet mix (1 capital flagship, 2 destroyers, 4 cruisers, 1 carrier, 4 escorts a
 * side, the same on both sides so the fleets are even), the house names, the ship names, and the 9 km opening gap.
 *
 * Houses (PKG-14, ASSUMED for Caleb to overrule): LORE.md names Jupiter's House of Ganymede, so the enemy keeps it. LORE
 * names no Saturn house (Titan's Autochthones rule by lot, on Athens's model), so the player's house is named for the
 * Athenian family of Kleisthenes, who gave Athens its democracy: the House of Kleisthenes. The world is not in the name;
 * it is the side's own `world` field, for any label that wants it.
 */
import type { BattleSetup, ShipSetup } from '../types';

const line = (names: string[]): ShipSetup[] => [
  // Order is the line abreast, top to bottom: escorts on the wings, the flagship in the middle.
  { name: names[0], cls: 'escort' },
  { name: names[1], cls: 'cruiser' },
  { name: names[2], cls: 'destroyer' },
  { name: names[3], cls: 'cruiser' },
  { name: names[4], cls: 'escort' },
  { name: names[5], cls: 'capital', flagship: true },
  { name: names[6], cls: 'carrier' },
  { name: names[7], cls: 'escort' },
  { name: names[8], cls: 'cruiser' },
  { name: names[9], cls: 'destroyer' },
  { name: names[10], cls: 'cruiser' },
  { name: names[11], cls: 'escort' },
];

export const SATURN_12V12: BattleSetup = {
  name: 'saturn-12v12',
  separationM: 9000,
  // Captains are people, not dice: both fleets keep the same captains in every run, and the battle seed varies only
  // the dice. Roster 1 is the first roster, not a picked one (PKG-02 report: how rosters 1–8 behave).
  rosterSeed: 1,
  player: {
    house: 'House of Kleisthenes',
    world: 'Saturn',
    ships: line(['Kleros', 'Pnyx', 'Bema', 'Agora', 'Lot', 'Astu', 'Ligeia', 'Ekklesia', 'Stoa', 'Thalassa', 'Hyperion', 'Phoebe']),
    standing: { engage: 'captains', boarding: false },
    controller: 'idle',
  },
  enemy: {
    house: 'House of Ganymede',
    world: 'Jupiter',
    ships: line(['Companion', 'Diadem', 'Basileus', 'Second Crown', 'Herald', 'Ganymede', 'Callirrhoe', 'Spear', 'Sceptre', 'Io', 'Europa', 'Amalthea']),
    standing: { engage: 'captains', boarding: false },
    controller: 'admiral-jupiter',
  },
};
