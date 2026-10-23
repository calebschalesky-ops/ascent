/**
 * What each nation calls its infantry carrier and its troops (INFANTRY-CARRIER.md section 8). Greek and Roman
 * history only, after each people's culture in LORE.md; the carrier's look is in components/space/carrier.ts.
 */
import type { NationId } from '../nations';

export interface InfantryNames {
  /** The carrier's class. */
  carrier: string;
  /** Why that name, one line. */
  why: string;
  /** Its troops. */
  troops: string;
  /** Hull names for the ships of the class, given in turn. */
  hulls: string[];
}

export const INFANTRY_NAMES: Record<NationId, InfantryNames> = {
  earth: { carrier: 'Gangway', why: 'Today’s navies: the gangway a landing party goes down. PLACEHOLDER, like Earth’s other class names.', troops: 'Marines', hulls: ['Gangway', 'Bridgehead', 'Shore Party', 'Foothold'] },
  moon: { carrier: 'Theoris', why: 'The sacred ship that carried a city’s embassy (theoria) to Delphi.', troops: 'Temple Wardens', hulls: ['Theoris', 'Paralos', 'Delia', 'Pythias'] },
  mercury: { carrier: 'Enomotia', why: 'The smallest Spartan unit, a band of men bound by oath.', troops: 'Spartiates', hulls: ['Enomotia', 'Lochos', 'Mora', 'Pentekostys'] },
  venus: { carrier: 'Chelandion', why: 'The Byzantine transport galley that carried horses and troops.', troops: 'Skoutatoi', hulls: ['Chelandion', 'Ousiakos', 'Pamphylos', 'Thema'] },
  mars: { carrier: 'Actuaria', why: 'The navis actuaria, Rome’s quick troop transport.', troops: 'Legionaries', hulls: ['Actuaria', 'Ponto', 'Corbita', 'Liburna'] },
  jupiter: { carrier: 'Hippagogos', why: 'The Hellenistic kings’ horse-transport ship.', troops: 'Pezhetairoi', hulls: ['Hippagogos', 'Basilis', 'Syntagma', 'Taxis'] },
  saturn: { carrier: 'Stratiotis', why: 'Athens’s troop trireme (stratiotis naus), oars and all.', troops: 'Epibatai', hulls: ['Stratiotis', 'Salaminia', 'Hoplitagogos', 'Epibates'] },
};

/** The name of a nation's `n`th carrier (0-based): the class's hull names in turn, numbered once they run out. */
export function carrierName(nation: NationId, n: number): string {
  const h = INFANTRY_NAMES[nation].hulls;
  return n < h.length ? h[n] : `${h[n % h.length]} ${Math.floor(n / h.length) + 1}`;
}
