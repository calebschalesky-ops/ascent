/**
 * Hangar capacity by hull: how many small craft each ship carries. The table every new ship-type thread reads
 * (notes: destroyer-hangars.md). Caleb, 2026-10-19: a cruiser carries more fighters and drones than a destroyer;
 * that is the one place the cruiser beats it.
 *
 * Capacity is in bay slots; one slot holds one fighter. The capital's 12 keep fleet-command's Captain bay (8 fighters)
 * with room for the new craft; the cruiser's 4 are progression's bay at its largest (level 8).
 */
import type { ShipType } from './shipTypes';

export type SmallCraft = 'fighter' | 'drone' | 'boarder' | 'dropship';

/**
 * Bay slots each small craft takes. Drones rack four to a slot; drill boarders and dropships take two. A dropship is a
 * one-squad lander nobody has built yet; it is not infantry-carrier's carrier, which is a 2 L ship of its own with no
 * hangar (infantry-to-destroyer.md).
 */
export const CRAFT_SLOTS: Record<SmallCraft, number> = { fighter: 1, drone: 0.25, boarder: 2, dropship: 2 };

/** Bay slots per hull. A ship type another thread adds carries nothing until it asks (destroyer-hangars.md). */
export const HANGAR_SLOTS: Record<ShipType, number> = { capital: 12, cruiser: 4, fighter: 0, destroyer: 2 };

export const slotsUsed = (load: Partial<Record<SmallCraft, number>>) =>
  (Object.keys(load) as SmallCraft[]).reduce((s, k) => s + (load[k] ?? 0) * CRAFT_SLOTS[k], 0);

/** Whether a load of small craft fits a hull's hangar. */
export const fits = (hull: ShipType, load: Partial<Record<SmallCraft, number>>) => slotsUsed(load) <= HANGAR_SLOTS[hull] + 1e-9;

/** The most of one kind of craft a hull can carry. */
export const capacity = (hull: ShipType, craft: SmallCraft) => Math.floor(HANGAR_SLOTS[hull] / CRAFT_SLOTS[craft] + 1e-9);
