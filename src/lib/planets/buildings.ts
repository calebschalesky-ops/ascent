/**
 * Planets: what stands in a site and what it gives each meter. FIRST PASS (PLANETS.md sections 1.3 and 1.4).
 *
 * Conquest owns the sites (capital, city, fort, shipyard, foundry, works, battery). This layer adds two things on top
 * of a site and changes none of conquest's rules:
 * - every site kind gives the meters a little just by working (`KIND_EFFECT`);
 * - a city or capital has a **city type**, and every site can hold **buildings**, each of one shared type.
 * A building works while its site works (its natives hold it and it is not suppressed).
 */
import type { Meters } from './meters';

/** Conquest's site kinds (src/lib/conquest/sites.ts on claude/conquest-0b139e, uncommitted when this was written). */
export type SiteKind = 'capital' | 'city' | 'fort' | 'shipyard' | 'foundry' | 'works' | 'battery';
/** Conquest's seven resources (conquest/resources.ts). */
export type Resource = 'metals' | 'ice' | 'hydrocarbons' | 'power' | 'helium3' | 'chemicals' | 'food';

/** What a bare working site gives, before any building in it. Works add economy by richness (`worksEconomy`). */
export const KIND_EFFECT: Record<SiteKind, Partial<Meters>> = {
  capital: { government: 10 },
  city: { economy: 5 },
  fort: { military: 10 },
  shipyard: { military: 8, economy: 2 },
  foundry: { military: 5, economy: 2 },
  works: {},
  battery: { military: 3 },
};
export const worksEconomy = (richness: number) => Math.min(6, 3 * richness);

/** The moment natives lose a site (captured or wrecked): instant shocks, on top of losing its targets. */
export const KIND_SHOCK: Record<SiteKind, Partial<Meters>> = {
  capital: { government: -35, religion: -5 },
  city: { government: -10, economy: -5 },
  fort: { government: -5, military: -8 },
  shipyard: { government: -5, military: -8 },
  foundry: { government: -3, military: -5 },
  works: { economy: -3 },
  battery: { military: -3 },
};

/** The eleven shared building types. Every planet's signature buildings are one of these, under its own name. */
export type BuildingType =
  | 'palace' | 'council' | 'temple' | 'sanctuary' | 'games' | 'market' | 'treasury' | 'academy' | 'barracks' | 'walls' | 'lifeline';

export interface BuildingTypeSpec { label: string; effect: Partial<Meters>; does: string }

export const BUILDING_TYPES: Record<BuildingType, BuildingTypeSpec> = {
  palace: { label: 'Palace', effect: { government: 12 }, does: 'The seat of whoever rules: the strongest single prop of government.' },
  council: { label: 'Council', effect: { government: 8, religion: 2 }, does: 'Where the ruled are heard: a senate, an assembly, a court of councillors.' },
  temple: { label: 'Temple', effect: { religion: 10 }, does: 'The gods of the city, and its festivals.' },
  sanctuary: { label: 'Sanctuary', effect: { religion: 15, economy: 4 }, does: 'A great shrine that others visit and pay: religion and pilgrims’ money.' },
  games: { label: 'Games', effect: { government: 5, religion: 3, economy: -2 }, does: 'Theatre, hippodrome or arena: content people, at a cost.' },
  market: { label: 'Market', effect: { economy: 10 }, does: 'Agora, forum, harbour: trade.' },
  treasury: { label: 'Treasury', effect: { economy: 6, government: 4 }, does: 'Mint and vaults: money, and the state’s credit.' },
  academy: { label: 'Academy', effect: { economy: 4, government: 3 }, does: 'Schools, libraries, archives: skill and administration.' },
  barracks: { label: 'Barracks', effect: { military: 10 }, does: 'Training and housing the soldiers and crews.' },
  walls: { label: 'Walls', effect: { military: 6, government: 2 }, does: 'Fortifications that keep the city and calm it.' },
  lifeline: { label: 'Lifeline', effect: { economy: 6, government: 4 }, does: 'What keeps the people alive on this world. Losing it is a disaster (PLANETS.md 1.5).' },
};
export const BUILDING_TYPE_IDS = Object.keys(BUILDING_TYPES) as BuildingType[];

/** City types. A city or capital site has one; it says which buildings a city of that type is expected to hold. */
export type CityType = 'seat' | 'market' | 'sanctuary' | 'colony' | 'court';
export interface CityTypeSpec { label: string; core: BuildingType[]; does: string }

export const CITY_TYPES: Record<CityType, CityTypeSpec> = {
  seat: { label: 'Seat', core: ['palace', 'council', 'temple'], does: 'The capital: government lives or dies with it.' },
  court: { label: 'Court', core: ['palace', 'games', 'treasury'], does: 'A royal or imperial court city: ceremony, money and favour.' },
  market: { label: 'Market', core: ['market', 'treasury'], does: 'A port or trading city: the economy’s heart.' },
  sanctuary: { label: 'Sanctuary', core: ['sanctuary', 'temple'], does: 'A holy city: religion first, pilgrims’ money second.' },
  colony: { label: 'Colony', core: ['market', 'barracks'], does: 'A planted town of settlers and veterans next to the works.' },
};
export const CITY_TYPE_IDS = Object.keys(CITY_TYPES) as CityType[];

/** One building on one planet: a shared type under a planet's own name, with a source where it is drawn from history. */
export interface BuildingDef {
  type: BuildingType;
  name: string;
  /** Replaces the type's effect for this one building (a signature building), when set. */
  effect?: Partial<Meters>;
  line?: string;
}

export const effectOf = (b: BuildingDef): Partial<Meters> => b.effect ?? BUILDING_TYPES[b.type].effect;
