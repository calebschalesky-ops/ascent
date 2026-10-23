import type { Standings } from './diplomacy/standings';
import { migrateStandings } from './diplomacy/standings';
import type { DirectorState } from './motivation/director';
import { migrateDirector } from './motivation/director';
import { openDB } from 'idb';
import type { RouteState } from './nav';
import type { Progress } from './progression/progress';
import { migrateProgress } from './progression/progress';
import type { Loadout } from './modules';
import { defaultLoadout, sanitizeLoadout } from './modules';
import type { Prize } from './boarding/prize';
import { migratePrizes } from './boarding/prize';
import type { ConquestState } from './conquest/state';
import { migrateConquest } from './conquest/persist';
import type { InfantryState } from './infantry/carrier';
import { migrateInfantry } from './infantry/persist';
import type { Binds } from '../components/controls/bindings';
import { DEFAULT_BINDS, migrateBinds } from '../components/controls/bindings';
import type { Pilot } from './opening/profile';
import { migratePilot } from './opening/profile';
import type { TutorialState } from './opening/tutorial';
import { migrateTutorial } from './opening/tutorial';
import type { GoalState } from './opening/goal';
import { migrateGoal } from './opening/goal';

export interface Settings {
  flight: FlightSettings;
  loadout: Loadout; // what the ship has fitted (the loadout screen in the pause menu)
}

export interface FlightSettings {
  invert: boolean;
  assist: boolean;
  look: number; // camera drag sensitivity, 0.1..2 (1: half a turn round the ship for a 900-pixel drag; controls/eve.ts). Was mouse look's until eve-controls (E1); old saves keep their value for the camera
  sensitivity: number; // 0.5..2: turn rate from keys, the gamepad stick and the touch joystick
  quality: 'high' | 'low'; // low: no bloom, lower resolution, for battery
  binds: Binds; // the key or mouse button for every flight action (components/controls/bindings.ts, the keybinds page)
  ovPinned: boolean; // the overview pinned at the right edge (eve-controls E7); off, hold Tab for it
}

/** A flight saved from the pause menu: where the ship was. */
export interface Journey {
  ship: { pos: [number, number, number]; scale?: number; yaw: number; pitch: number; target: string | null; route?: RouteState; inside?: string | null; docked?: string | null; hull?: number }; // inside: the body the ship is inside; docked: the station it is docked at; hull: its hull points; scale: nav.ts COSMOS when saved (absent before the rescale, i.e. 1)
  savedAt: number;
}

export interface GameData {
  app: 'ascent-flight';
  version: 1;
  journey: Journey | null;
  settings: Settings;
  progress: Progress | null; // race, level, credits, fit, bay; null in a save from before progression (an Earth pilot)
  prizes: Prize[]; // ships taken by boarding (lib/boarding/prize.ts); empty in a save from before boarding
  conquest: ConquestState | null; // every world's ships, sites and production (CONQUEST.md); null before conquest: a fresh one
  infantry: InfantryState | null; // infantry carriers mid-operation and the garrisons they left (INFANTRY-CARRIER.md); null: none yet
  pilot: Pilot | null; // the character and the first ship's name and paint (the opening); null in an older save
  tutorial: TutorialState | null; // where the shakedown flight is; null in an older save (treated as done)
  goal: GoalState | null; // the goal the opening launched the player at
  standings: Standings | null; // how each house regards each other (lib/diplomacy/standings); null: the starting table
  director: { t: number; d: DirectorState } | null; // the director's clock (minutes of flight) and state; null: not started
}

/** The one door to storage. Any backend implements this same interface. */
export interface GameStore {
  load(): Promise<GameData | null>;
  save(data: GameData): Promise<void>;
}

export function freshData(): GameData {
  return {
    app: 'ascent-flight',
    version: 1,
    journey: null,
    progress: null,
    prizes: [],
    conquest: null,
    infantry: null,
    pilot: null,
    tutorial: null,
    goal: null,
    standings: null,
    director: null,
    settings: {
      flight: { invert: false, assist: true, look: 1, sensitivity: 1, quality: 'high', binds: { ...DEFAULT_BINDS }, ovPinned: true },
      loadout: defaultLoadout(),
    },
  };
}

/** Accepts any older or partial save; keeps the journey and flight settings, drops what no longer exists. */
export function migrate(raw: unknown): GameData {
  const fresh = freshData();
  if (!raw || typeof raw !== 'object') return fresh;
  const d = raw as Partial<GameData> & { settings?: Partial<Settings> };
  const j = d.journey && typeof d.journey === 'object' && d.journey.ship ? { ship: d.journey.ship, savedAt: Number(d.journey.savedAt) || 0 } : null;
  const progress = migrateProgress((d as { progress?: unknown }).progress);
  return {
    ...fresh,
    journey: j,
    progress,
    prizes: migratePrizes((d as { prizes?: unknown }).prizes),
    conquest: migrateConquest((d as { conquest?: unknown }).conquest, progress?.nation ?? 'earth'),
    infantry: migrateInfantry((d as { infantry?: unknown }).infantry),
    pilot: migratePilot((d as { pilot?: unknown }).pilot),
    tutorial: migrateTutorial((d as { tutorial?: unknown }).tutorial),
    goal: migrateGoal((d as { goal?: unknown }).goal),
    standings: migrateStandings((d as { standings?: unknown }).standings),
    director: migrateDirector((d as { director?: unknown }).director),
    settings: {
      ...fresh.settings,
      flight: migrateFlight(d.settings?.flight),
      loadout: sanitizeLoadout(d.settings?.loadout),
    },
  };
}

/**
 * Flight settings from any save, field by field. A save from before mouse look carries `steer: 'cursor' | 'drag'`,
 * which no longer exists (the mouse always looks, R1): it is dropped. Anything of the wrong type takes the default.
 */
export function migrateFlight(raw: unknown): FlightSettings {
  const f = freshData().settings.flight;
  if (!raw || typeof raw !== 'object') return f;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
  return {
    invert: typeof r.invert === 'boolean' ? r.invert : f.invert,
    assist: typeof r.assist === 'boolean' ? r.assist : f.assist,
    look: num(r.look, 0.1, 2, f.look),
    sensitivity: num(r.sensitivity, 0.5, 2, f.sensitivity),
    quality: r.quality === 'low' || r.quality === 'high' ? r.quality : f.quality,
    binds: migrateBinds(r.binds),
    ovPinned: typeof r.ovPinned === 'boolean' ? r.ovPinned : f.ovPinned,
  };
}

export class IdbStore implements GameStore {
  private db = openDB('ascent-flight', 1, {
    upgrade(db) {
      db.createObjectStore('kv');
    },
  });
  async load() {
    const raw = await (await this.db).get('kv', 'data');
    return raw ? migrate(raw) : null;
  }
  async save(data: GameData) {
    await (await this.db).put('kv', data, 'data');
  }
}
