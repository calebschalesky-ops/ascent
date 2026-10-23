/**
 * The painted art of each people, cropped from the accepted reference sheets (art-refit/02-RACES.md) by
 * scripts/crop-races.mjs into public/races/<nation>/. Sizes are the crops' own pixels: the art is shown at that size or
 * smaller, never larger. The SVG Portrait (components/codex/art/Portrait.tsx) stands in when an image fails to load.
 *
 * Heights never come from these images (the sheets' line-ups are wrong on six of eight). Anything that sets peoples
 * side by side or scales one figure against another uses HEIGHT_M, from the Decisions list in 02-RACES.md.
 */
import type { NationId } from './nations';

export interface ArtImage { src: string; w: number; h: number }

export interface RaceArt {
  /** The front head study: the codex and comms portrait. */
  head: ArtImage;
  /** The front figure of the turnaround, in full flight armour. */
  body: ArtImage;
  /** The leader in ceremonial dress, where the sheet drew one that can be used as drawn. */
  leader?: ArtImage & { title: string };
  /** What the sheet gets wrong that a crop can't fix (02-RACES.md Results), kept with the art it is about. */
  flaws: string[];
}

const img = (n: NationId, part: string, w: number, h: number): ArtImage => ({ src: `races/${n}/${part}.webp`, w, h });

export const RACE_ART: Record<NationId, RaceArt> = {
  earth: {
    head: img('earth', 'head', 120, 150), body: img('earth', 'body', 236, 486),
    leader: { ...img('earth', 'leader', 118, 230), title: 'The Strategos' },
    flaws: ['The sheet’s line-up has the grey silhouettes taller than him; he is the 1.75 m baseline.'],
  },
  moon: {
    head: img('moon', 'head', 116, 160), body: img('moon', 'body', 210, 490),
    leader: { ...img('moon', 'leader', 104, 294), title: 'The Pythia' },
    flaws: ['On the sheet the Pythia stands shorter than the pilot; she should be a little taller. She wears sandals.'],
  },
  mercury: {
    head: img('mercury', 'head', 124, 168), body: img('mercury', 'body', 194, 488),
    flaws: [
      'The second clear eyelid doesn’t show.',
      'The King of the Field is drawn pale (he should be as dark as the soldier), so he is left out.',
      'The soldier in ceremonial dress is missing from the sheet.',
    ],
  },
  venus: {
    head: img('venus', 'head', 116, 156), body: img('venus', 'body', 226, 470),
    leader: { ...img('venus', 'leader', 106, 274), title: 'The Autokrator' },
    flaws: ['The pearly sheen on the skin barely shows.'],
  },
  mars: {
    head: img('mars', 'head', 114, 154), body: img('mars', 'body', 212, 464),
    leader: { ...img('mars', 'leader', 92, 188), title: 'A consul' },
    flaws: ['The eyes are normal size; the lore makes them large, with large pupils. The consul wears sandals.'],
  },
  jupiter: {
    head: img('jupiter', 'head', 108, 176), body: img('jupiter', 'body', 198, 486),
    leader: { ...img('jupiter', 'leader', 106, 282), title: 'A Basileus' },
    flaws: ['The pilot’s parade armour is plainer than asked (no relief or lion heads). The Basileus wears sandals.'],
  },
  saturn: {
    head: img('saturn', 'head', 166, 192), body: img('saturn', 'body', 220, 480),
    leader: { ...img('saturn', 'leader', 104, 232), title: 'A general of the Ten' },
    flaws: ['The eyes are only slightly enlarged; the lore makes them very large. The general wears sandals.'],
  },
};

/** Standing height in metres, from 02-RACES.md Decisions. The sheets' own line-ups are not to be trusted. */
export const HEIGHT_M: Record<NationId, number> = {
  venus: 1.5, earth: 1.75, mercury: 1.9, mars: 1.95, saturn: 2.1, moon: 2.2, jupiter: 2.4,
};

/** "A Human", "An Autochthon": the demonym with its article. */
export const aDemonym = (demonym: string): string => `${/^[AEIOU]/.test(demonym) ? 'An' : 'A'} ${demonym}`;

/**
 * The player's own pilot, painted (Gemini, GEMINI-PROMPTS.md "Pilot portraits"): one woman and one man of each people,
 * in the people's flight armour and headwear. Every people has one look (ART-DIRECTION.md "One people, one look"), so
 * the avatar's skin, hair and eye swatches are shades of it and one painting stands for all of them; the name picks the
 * face. Each image is cut to one 4:5 box and stored at 3 x PILOT_BOX.
 */
export type PilotSex = 'f' | 'm';
export const PILOT_BOX = { w: 160, h: 200 };

/** The given names offered for women (AVATAR_OPTIONS given lists); every other offered name is a man's. */
const WOMEN = new Set([
  'Amara', 'Sofia', 'Priya', 'Leila', 'Ingrid', 'Ada', 'Hypatia', 'Theano', 'Diotima', 'Kallisto', 'Agathe', 'Gorgo',
  'Kyniska', 'Arete', 'Chilonis', 'Anna', 'Theodora', 'Zoe', 'Eudokia', 'Irene', 'Kassia', 'Cornelia', 'Livia',
  'Aurelia', 'Tullia', 'Valeria', 'Berenike', 'Arsinoe', 'Stratonike', 'Laodike', 'Apama', 'Aspasia', 'Xanthippe',
  'Phryne', 'Lysistrata', 'Hipparete',
]);
const MEN = new Set([
  'Kenji', 'Mateo', 'Tomas', 'Daniel', 'Yusuf', 'Wei', 'Aristarchos', 'Hipparchos', 'Philolaos', 'Eudoxos', 'Meton',
  'Leonidas', 'Brasidas', 'Lysandros', 'Agis', 'Pausanias', 'Dienekes', 'Ioannes', 'Basil', 'Nikephoros', 'Alexios',
  'Gaius', 'Marcus', 'Lucius', 'Aulus', 'Quintus', 'Ptolemaios', 'Seleukos', 'Antigonos', 'Demetrios', 'Lysimachos',
  'Kleon', 'Perikles', 'Thoukydides', 'Alkibiades', 'Ephialtes',
]);

/**
 * Whose face a name gets: an offered given name says; a typed one ending in -a is a woman's; any other typed name is
 * settled by a hash of it, so the same name always gets the same face.
 */
export function pilotSex(name: string): PilotSex {
  const first = name.trim().split(/\s+/)[0] ?? '';
  if (WOMEN.has(first)) return 'f';
  if (MEN.has(first)) return 'm';
  if (/a$/i.test(first)) return 'f';
  let h = 0;
  for (const c of first.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 2 ? 'f' : 'm';
}

/** The painted pilot for a people and a name. */
export function pilotArt(n: NationId, name: string): ArtImage {
  return { src: `races/${n}/pilot-${pilotSex(name)}.webp`, ...PILOT_BOX };
}

/** The URL of a piece of race art under the app's base path. */
export const artUrl = (a: ArtImage): string => `${import.meta.env.BASE_URL}${a.src}`;
