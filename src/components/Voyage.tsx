import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { GameData, Journey } from '../lib/store';
import { COLOR, LAYOUT, SPHERE_NAMES, SPHERE_ORDER, isPlanet } from '../lib/bodies';
import type { SphereId } from '../lib/bodies';
import { LABEL_FONT } from './three-helpers';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LIMIT, VR, buildVoyageScene, zoneOf } from './voyageScene';
import { FARTHEST, SUN_POS, sub } from '../lib/nav';
import { SHIP_MODEL_LENGTH, buildShip } from './space/ship';
import { dressAsNation } from './space/fleet';
import type { PilotShip } from './space/pilotShip';
import { buildPilotShip } from './space/pilotShip';
import type { ShipLook } from '../lib/opening/profile';
import type { FlightProbe } from '../lib/opening/tutorial';
import { makeSpaceUniforms } from './space/materials';
import { createRenderOrigin } from './space/origin';
import type { Target } from './voyageScene';
import ArrivalCard from './ArrivalCard';
import type { Dest, DestGeo, LegPlan, RouteState, V3 } from '../lib/nav';
import {
  TOUR_ROUTE, AUTO, COSMOS, migratePos, DESTS, DEST_LABEL, EMPTY_ROUTE, destSphere, isDest, fmtDist, fmtEta, orbitBody, orbitPeriod, orbitStep, parkSlack, parkSpeedAt, minSpeed, planPath, planRoute, routeAdd, routeArrived,
  routeContinue, routeCurrent, routeDone, routeFromSave, routeMove, routeRemove, shipAxes, add, scale,
} from '../lib/nav';
import NavOverlay, { destGlyph } from './NavOverlay';
import InsideRoom, { washColor } from './InsideRoom';
import type { NavActions, NavTab } from './NavOverlay';
import { PHASE_LABEL, drawNavMap, fitCanvas, mapXY } from './navMap';
import type { NavSnap, Phase } from './navMap';
import { createCombat } from './combat';
import { createDuel } from './duel';
import { createSwarms, rackLine } from './swarms';
import type { Combat } from './combat';
import { MUNITIONS } from '../lib/munitions';
import type { MunitionId } from '../lib/munitions';
import { fitted, sanitizeLoadout } from '../lib/modules';
import { COUNTERS } from '../lib/tech';
import { NATIONS } from '../lib/nations';
import { createFleetCommand } from './fleet/fleetRuntime';
import type { FleetCommand } from './fleet/fleetRuntime';
import CommandBar, { commandKey } from './fleet/CommandBar';
import type { MunitionStats } from './arsenal';
import { PLAYER_NATION } from '../lib/nations';
import type { NationId } from '../lib/nations';
import type { FlightHooks } from './wingmen';
import { worldGeometry, stationPlaces } from '../lib/world';
import { PLAYER_HULL, isStation, stationById } from '../lib/stations';
import type { StationId } from '../lib/stations';
import { buildMoons } from './moonScene';
import { createStationDefense } from './stationDefense';
import type { StationDefense } from './stationDefense';
import { buildArmour } from './armourScene';
import type { ArmourLayer } from './armourScene';
import { ARMOUR_HOMES, armourGrid, armourPush, cellDir, cellIndex } from '../lib/megastructure/armour';
import type { ArmourFrame, ArmourHome, Grid } from '../lib/megastructure/armour';
import { BERTH, armourPlaces } from '../lib/megastructure/hardpoints';
import { setPiecePush } from '../lib/megastructure/setpieces';
import { REFUSAL_TEXT, dropPoint, jumpPath, longLeg, refusal, spaceOf } from '../lib/hyperspace';
import type { Hostile } from '../lib/hyperspace';
import { createHyperspace } from './hyperspace';
import { KM_PER_UNIT } from '../lib/bodies';
import StationScreen from './StationScreen';
import { createPlanetAir } from './planet/planetAir';
import type { AirHud as AirHudState } from './planet/planetAir';
import AirHud from './planet/AirHud';
import * as FX from './fx';
import { aimError, aimRates, angleBetween, look } from './controls/aim';
import { activeLock, newLockSet, pickAlong, setActive, startLock, stepLocks, unlock } from './controls/targets';
import type { Picked } from './controls/targets';
import SelectedPanel, { ContextMenu, LockRow } from './controls/SelectedPanel';
import type { LockIcon, SelAction, SelInfo } from './controls/SelectedPanel';
import { EVE, flyCommand, isDoubleClick, orbitDrag, orbitOffset, trackedGun, zoomStep } from './controls/eve';
import type { Click } from './controls/eve';
import { DEFAULT_BINDS, actionFor, codeOf, keyLabel, mouseCode } from './controls/bindings';
import { GUARD } from '../lib/guard';
import { STANCE, STANCE_LABEL, nextStance, scrollDistance, stanceSteer } from './controls/stance';
import type { Stance } from './controls/stance';
import Overview from './controls/Overview';
import { FEEL, hitTick } from './controls/feel';
import type { OverviewRow } from './controls/Overview';
import { RACE_REFS } from '../lib/progression/refs';
import type { Action } from './controls/bindings';
import { doubleTap, newDodge, stepLateral, stopLateral, tryDodge } from './controls/thrust';
import type { Lateral } from './controls/thrust';
import { REPAIR_SLOT, SLOT_KINDS, SWARM_SLOT, isWeaponSlot, newSlotMemory, nextRole, noteSlot, scrollSlot, slotGate, swapTarget } from './controls/hotbarSlots';
import { SLOTS } from '../lib/progression/catalog';
import Hotbar from './controls/Hotbar';
import type { BarSlot } from './controls/Hotbar';
import type { SwarmRole } from '../lib/swarm/roles';
import { ROLE_LABEL, SWARM_ROLES } from '../lib/swarm/roles';
import { FLYING, killMember } from '../lib/swarm/swarm';

export type ShipState = Journey['ship'];
export interface VoyageApi {
  getState: () => ShipState;
  setState: (s: ShipState) => void;
  openNav: (tab: NavTab) => void;
  /** What the flight is doing now, for the opening's tutorial (lib/opening/tutorial.ts). */
  probe: () => FlightProbe;
  /** Make `d` the target without engaging the autopilot (Space then flies there). */
  setTarget: (d: Dest) => void;
  /** Make `d` the target and engage the autopilot. */
  flyTo: (d: Dest) => void;
  setHull: (v: number) => void;
  /** Drill targets for the tutorial: `n` in front of the ship (0 clears them). Returns how many are left. */
  drill: (n: number) => number;
  /**
   * Hold the ship on station: an idle ship does not fall into orbit. For the drill, whose buoys keep station off the
   * bow: bolts do not inherit an orbit's motion, and round a giant that is faster than a bolt.
   */
  holdStation: (on: boolean) => void;
}

interface Props {
  data: GameData;
  paused: boolean;
  onMenu: () => void; // Escape or the Menu button
  spawn: ShipState | null; // where to start (a saved journey), or null for a fresh start
  apiRef: React.MutableRefObject<VoyageApi | null>;
  full?: boolean; // the flight view fills the screen
  onFull?: () => void; // toggle full screen (button or the full-screen key)
  onLoadout?: () => void; // the ship and loadout screen (E)
  hooks?: FlightHooks; // progression: wingmen, extra keys, the weapons the ship carries
  look?: { nation: NationId; ship: Pick<ShipLook, 'trim' | 'finish'> } | null; // the opening's ship: the nation's cruiser, painted; else the brass courier
}

/** How far ahead of the ship the tutorial's drill targets circle: well inside the laser's reach and the lock's. */
const DRILL_RANGE = 70;
const AUTO_SPEED = AUTO.speed; // top speed in open space; near a body the cap falls with distance to its surface
const SHIP = 0.18; // hull 2.06 model units long, so 0.371 scene units: Earth's radius (VR.earth = 370) is about 1,000 of these
const SHIP_LENGTH = SHIP * 2.06; // the model runs 2.06 of its own units, nose to nozzles: stations are sized in these
const DOCK_IN = 3.2; // seconds for the docking run: to the berth's approach point, then down into the cradle
const MAX_YAW = 1.2; // rad/s at full stick
const MAX_PITCH = 0.95;
const MIN_CRUISE = 0.4; // throttle maps logarithmically from here...
const MAX_CRUISE = 400 * COSMOS; // ...to here (74,000), so low settings give fine control and high ones cross the cosmos
const BOOST = 2.5;


const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const forwardOf = (yaw: number, pitch: number) =>
  new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
/** Stick shaping: a small dead zone, then a curve that is gentle near the centre and full at the edge. */
const shape = (x: number) => {
  const a = Math.abs(x);
  if (a < 0.08) return 0;
  const t = (a - 0.08) / 0.92;
  return Math.sign(x) * (0.35 * t + 0.65 * t * t);
};
const cruiseOf = (throttle: number) => (throttle <= 0.005 ? 0 : MIN_CRUISE * Math.pow(MAX_CRUISE / MIN_CRUISE, throttle));
const throttleOf = (speed: number) => (speed <= MIN_CRUISE ? 0 : clamp(Math.log(speed / MIN_CRUISE) / Math.log(MAX_CRUISE / MIN_CRUISE), 0, 1));
interface Arms { energy: number; energyMax: number; ammo: number | null; shield: number; hull: number; maxHull: number; counter: string | null; counterLeft: number; block: string | null; down?: boolean; disabled?: number; incoming?: number; locking?: number; locked?: number }
interface Hud { arms: Arms | null; speed: number; zone: SphereId; throttle: number; limited: boolean; dist: number | null; auto: boolean; phase: Phase | null; leg: number | null; total: number | null; orbit: Dest | null; lap: number | null; here: Dest | null; entering: Dest | null; cardDist: number | null; lock: { name: string; progress: number; locked: boolean } | null; aim: { name: string; willHit: boolean } | null; kills: number; drones: string; bar: BarSlot[]; stance: string | null; pick: string | null; ov: OverviewRow[]; air: AirHudState | null; airEvent: { text: string; n: number } | null; useOn: boolean; jump: string | null; sel: SelInfo | null; locks: LockIcon[] }
/** Actions held down (movement, freelook, the overview); every other action happens once per press. */
/** Pressed and released (mouse buttons by default, but any of them may be put on a key). */
const CLICKS = new Set<Action>(['fire', 'use', 'pick']);
const HELD = new Set<Action>(['forward', 'back', 'left', 'right', 'up', 'down', 'boost', 'stop', 'freelook', 'turnLeft', 'turnRight', 'pitchUp', 'pitchDown']);
/** Flying a capital ship: it turns at this fraction of the cruiser's rate, and the camera sits this much further back. */
const CAPITAL_TURN = 0.35;
const CAPITAL_CAM = 4;

/** The weapon line under the speed: rounds left, the lock as it builds, or whether the line of fire will hit. */
function weaponLine(w: MunitionId, hud: Hud): string {
  const m = MUNITIONS[w];
  const a = hud.arms;
  const rounds = a && a.ammo !== null ? ` ${a.ammo}` : '';
  const block = a?.block === 'energy' ? ' · no energy' : a?.block === 'ammo' ? ' · empty' : a?.block === 'lock' ? ' · needs a lock' : a?.block === 'not fitted' ? ' · not fitted' : '';
  const down = (hud.kills ? ` · ${hud.kills} down` : '') + (hud.drones ? ` · ${hud.drones}` : '');
  if (m.lock !== 'none') {
    const l = hud.lock;
    return rounds + (l ? (l.locked ? ` · LOCKED: ${l.name}` : ` · locking ${l.name} ${Math.round(l.progress * 100)}%`) : ' · no lock') + block + down;
  }
  if (m.delivery === 'mine') return rounds + block + down;
  return rounds + (hud.aim ? ` · ${hud.aim.name} · ${hud.aim.willHit ? 'will hit' : 'will miss'}` : '') + block + down;
}
/** Shield, hull, capacitor and countermeasure, one line. */
function armsLine(a: Arms | null): string {
  if (!a) return '';
  const cm = a.counter && a.counter !== 'jammer' ? ` · ${COUNTERS[a.counter as keyof typeof COUNTERS].name.toLowerCase()} ${a.counterLeft}` : a.counter ? ' · jammer on' : '';
  // The lost state (GP-15a): what it cost is flashed by the hooks; the ship comes back at the nearest held station.
  if (a.down) return 'SHIP LOST · respawning at your nearest held station';
  const warn = `${a.disabled ? ' · DISABLED' : ''}${a.locked ? ` · LOCKED ON ×${a.locked}` : a.locking ? ' · being locked' : ''}${a.incoming ? ` · MISSILE ×${a.incoming}` : ''}`;
  return `shield ${Math.round(a.shield * 100)}% · hull ${Math.round(a.hull)} · energy ${Math.round(a.energy)}${cm}${warn}`;
}

export default function Voyage({ data, paused, onMenu, spawn, apiRef, full = false, onFull, onLoadout, hooks, look: pilotLook }: Props) {
  const hooksRef = useRef(hooks);
  hooksRef.current = hooks;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onMenuRef = useRef(onMenu);
  onMenuRef.current = onMenu;
  const onFullRef = useRef(onFull);
  onFullRef.current = onFull;
  const onLoadoutRef = useRef(onLoadout);
  onLoadoutRef.current = onLoadout;
  const spawnRef = useRef(spawn);
  const aimRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<{ renderer: THREE.WebGLRenderer; composer: EffectComposer; bloom: UnrealBloomPass } | null>(null);
  const flightRef = useRef(data.settings.flight);
  flightRef.current = data.settings.flight;
  const worldRef = useRef<ReturnType<typeof buildVoyageScene> | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const joyBaseRef = useRef<HTMLDivElement>(null);
  const joyKnobRef = useRef<HTMLDivElement>(null);
  const throttleFillRef = useRef<HTMLDivElement>(null);
  const lockMarkRef = useRef<HTMLDivElement>(null);
  const leadMarkRef = useRef<HTMLDivElement>(null);
  const boreMarkRef = useRef<HTMLDivElement>(null);
  const noseMarkRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const pickMarkRef = useRef<HTMLDivElement>(null); // the picked ship's bracket (R7)
  const hurtRef = useRef<HTMLDivElement>(null); // the red edge when the ship is hit (R12) // the crosshair: out of the gun arc, the block up, a lock being drawn // where the nose points, as it catches up with the crosshair (R1)
  const flyMarkRef = useRef<HTMLDivElement>(null); // where a double-click sent the ship (E3)
  const combatRef = useRef<Combat | null>(null);
  const pilotShipRef = useRef<PilotShip | null>(null); // the player's cruiser, refitted when the loadout changes
  // Fleet command: the runtime, and whether command mode (C) is taking the keys.
  const fleetRef = useRef<FleetCommand | null>(null);
  const [fleetReady, setFleetReady] = useState(false);
  const [cmdMode, setCmdModeUi] = useState(false);
  const cmdModeRef = useRef(false);
  const setCmdMode = (on: boolean) => { cmdModeRef.current = on; setCmdModeUi(on); };
  const stationDefRef = useRef<StationDefense | null>(null);
  // Weapons: the one selected, and whether the trigger is held (left mouse button, or the Fire button).
  // The loadout: progression's fit as arsenal flies it (hooks.loadout), else Settings' loadout. G cycles its weapons.
  const loadout = hooksRef.current?.loadout?.() ?? sanitizeLoadout(data.settings.loadout);
  const loadoutKey = JSON.stringify(loadout);
  const loadoutRef = useRef(loadout);
  loadoutRef.current = loadout;
  const boostRef = useRef(BOOST); // the afterburner module sets it (Mk I is the original 2.5)
  const [weapon, setWeaponUi] = useState<MunitionId>(loadout.weapons[0]);
  const weaponRef = useRef<MunitionId>(loadout.weapons[0]);
  const setWeapon = (w: MunitionId) => { weaponRef.current = w; setWeaponUi(w); };
  // The hotbar (R4, controls/hotbar.ts): the picked slot, the weapon slots used last (for F), the swarm's role.
  const [slot, setSlotUi] = useState(0);
  const slotRef = useRef(0);
  const slotMem = useRef(newSlotMemory());
  const swarmRole = useRef<SwarmRole>('explosive');
  const selectSlot = (i: number) => {
    if (i === SWARM_SLOT && slotRef.current === SWARM_SLOT) swarmRole.current = nextRole(swarmRole.current); // 5 again: the next role
    if (i !== slotRef.current) { draw.current.on = false; draw.current.release = false; weaponOn.current = { on: false, target: null }; if (combatRef.current) combatRef.current.arsenal.player.guard = false; }
    slotRef.current = i; setSlotUi(i);
    if (isWeaponSlot(i)) {
      slotMem.current = noteSlot(slotMem.current, i);
      const w = loadoutRef.current.weapons[i];
      if (w) setWeapon(w);
    }
  };
  /**
   * A slot clicked or tapped on the hotbar. On a touch screen there is no right button, so tapping the picked utility
   * slot again uses it: drones launch or come home, fighters go out or back.
   */
  const pickSlot = (i: number) => {
    if (touch && i === slotRef.current && !isWeaponSlot(i)) { clickRef.current.down('use'); clickRef.current.up('use'); return; }
    selectSlot(i);
  };
  /** The touch weapon button: the next weapon slot with a weapon in it. */
  const cycleWeapon = () => {
    const n = loadoutRef.current.weapons.length;
    const cur = isWeaponSlot(slotRef.current) ? slotRef.current : slotMem.current.last;
    selectSlot(n ? (cur + 1) % n : 0);
  };
  const firing = useRef(false);
  // EVE (E4-E7): the locks held (controls/targets.ts), the weapon switched on (it cycles at the active target until
  // switched off, as an EVE module does), the right-click menu, and the selection's and the locks' actions.
  const locksRef = useRef(newLockSet());
  const weaponOn = useRef<{ on: boolean; target: number | null }>({ on: false, target: null });
  const [menu, setMenu] = useState<{ x: number; y: number; sel: SelInfo } | null>(null);
  const menuOpen = useRef(false);
  menuOpen.current = !!menu;
  const selActRef = useRef<(a: SelAction, key?: string) => void>(() => {});
  const apiSel = useRef<(() => void) | null>(null); // clear the selection (the panel's ✕)
  const lockIconRef = useRef<{ click: (id: number) => void; unlock: (id: number) => void; ovLock: (key: string) => void }>({ click: () => {}, unlock: () => {}, ovLock: () => {} });
  // Right click (R6): a missile being drawn like a bow (the lock builds only meanwhile; letting go looses it).
  const draw = useRef({ on: false, release: false });
  const clickRef = useRef<{ down: (a: Action) => void; up: (a: Action) => void }>({ down: () => {}, up: () => {} });
  // Middle click picks a target (R7): a ship by its id, or a body or station (which is also the autopilot's target).
  const pickRef = useRef<{ kind: 'ship'; id: number } | { kind: 'body'; id: Dest } | null>(null);
  // R: the stance on the picked target (R8), its distance, and R held for scrolling the distance.
  const stanceRef = useRef<{ mode: Stance | null; dist: number | null; rAt: number | null; scrolled: boolean }>({ mode: null, dist: null, rAt: null, scrolled: false });
  // Hold Tab: the overview (R9), with the cursor freed.
  const [overview, setOverviewUi] = useState(false);
  const overviewRef = useRef(false);
  const setOverview = (on: boolean) => { overviewRef.current = on; setOverviewUi(on); };
  const [ovFilter, setOvFilter] = useState<'ships' | 'all'>('ships');
  const ovFilterRef = useRef(ovFilter);
  ovFilterRef.current = ovFilter;
  const ovPickRef = useRef<(key: string) => void>(() => {});
  // F1 hides the HUD; F5 cycles the camera: chase, cockpit, rear view (R10).
  const hudOffRef = useRef(false);
  const camModeRef = useRef<0 | 1 | 2>(0);
  const CAM_LABEL = ['Chase camera', 'Cockpit', 'Rear view'] as const;
  /** Let go of everything the mouse holds (a menu opened, the window lost focus, the slot changed). */
  const letGo = () => {
    firing.current = false;
    draw.current.on = false; draw.current.release = false;
    const a = combatRef.current?.arsenal;
    if (a) a.player.guard = false;
  };
  const countermeasureRef = useRef<() => void>(() => undefined); // C or the touch button: set by the flight loop

  // Inputs, read by the frame loop. `keys` holds the actions held down (controls/bindings.ts maps keys to actions).
  const keys = useRef(new Set<Action>());
  const binds = () => flightRef.current?.binds ?? DEFAULT_BINDS;
  const sprint = useRef(false); // double-tap throttle up: boost while it stays held (Minecraft's sprint)
  const [note, setNote] = useState<{ text: string; n: number } | null>(null); // a short line under the crosshair
  const noteN = useRef(0);
  const flash = (text: string) => setNote({ text, n: ++noteN.current });
  const stick = useRef({ x: 0, y: 0 }); // touch joystick or mouse drag, -1..1, y down positive
  const throttle = useRef(0);
  const boost = useRef(false);
  const stopReq = useRef(false);
  const holdStation = useRef(false); // the tutorial's drill: no idle orbit
  const autopilot = useRef<Dest | null>(null);
  const target = useRef<Dest | null>(null);

  const [dest, setDest] = useState<Dest | null>(null); // the chosen target, for the chips
  const jumpRef = useRef<(() => void) | null>(null); // the HUD's Jump button (scale-jump-danger J1)
  const [card, setCard] = useState<Dest | null>(null);
  const cardRef = useRef(card);
  cardRef.current = card;
  const [hud, setHud] = useState<Hud>({ speed: 0, zone: 'near', throttle: 0, limited: false, dist: null, auto: false, phase: null, leg: null, total: null, orbit: null, lap: null, here: null, entering: null, cardDist: null, lock: null, aim: null, kills: 0, arms: null, drones: '', bar: [], stance: null, pick: null, ov: [], air: null, airEvent: null, useOn: false, jump: null, sel: null, locks: [] });
  // Entering a body: the sphere whose display is open, and the frame loop's enter and leave.
  const [inside, setInside] = useState<Dest | null>(null);
  const insideRef = useRef<Dest | null>(null);
  const washRef = useRef<HTMLDivElement>(null);
  const heatRef = useRef<HTMLDivElement>(null);
  const ctl = useRef({ enter: () => {}, leave: () => {} });
  // Docking: the station in range, the one docked at, and the hull (repaired at a station).
  const [dockable, setDockable] = useState<StationId | null>(null);
  const [docked, setDocked] = useState<StationId | null>(null);
  const [hull, setHull] = useState(PLAYER_HULL);
  const hullRef = useRef(PLAYER_HULL);
  // One hull for the player (integration pass 2): arsenal's defences. hullRef mirrors it each frame for the station
  // screen and the save; setting it (repair, load) writes arsenal's hull, and a repair refills the shield too.
  const setHullBoth = (v: number) => {
    const d = combatRef.current?.arsenal.player.def;
    const max = d ? d.maxHull : PLAYER_HULL;
    hullRef.current = clamp(v, 0, max);
    if (d) { d.hull = hullRef.current; if (v >= max) d.shield = d.shield.map(() => d.maxShield); }
    setHull(hullRef.current);
  };
  const dockCtl = useRef<{ dock: (id?: StationId) => void; undock: () => void }>({ dock: () => {}, undock: () => {} });
  const [banner, setBanner] = useState<{ zone: SphereId; outward: boolean; n: number } | null>(null);
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  // Navigation: the route of stops, the autopilot's detour points, the map and the navigation screen.
  const routeRef = useRef<RouteState>({ ...EMPTY_ROUTE });
  const [route, setRouteUi] = useState<RouteState>(EMPTY_ROUTE);
  const planRef = useRef<{ dest: Dest; vias: THREE.Vector3[]; at: number } | null>(null);
  const geoRef = useRef<DestGeo[]>(worldGeometry(SHIP_LENGTH)); // the ten, the major moons and the stations
  const [nav, setNav] = useState<NavTab | null>(null);
  const navRef = useRef(nav);
  navRef.current = nav;
  const miniRef = useRef<HTMLCanvasElement>(null);
  const snapRef = useRef<() => NavSnap | null>(() => null);

  /** Set the route; when it is engaged, the autopilot flies to its current stop. */
  const applyRoute = (r: RouteState) => {
    routeRef.current = r;
    setRouteUi(r);
    const cur = routeCurrent(r);
    if (r.engaged && !r.waiting && cur) { target.current = cur; autopilot.current = cur; setDest(cur); planRef.current = null; }
  };
  /** Manual input: the route pauses (a stop you were parked at counts as visited). Resume picks it up again. */
  const takeOver = () => {
    const r = routeRef.current;
    if (r.waiting) applyRoute({ ...routeContinue(r), engaged: false });
    else if (r.engaged) applyRoute({ ...r, engaged: false });
  };
  const choose = (d: Dest) => {
    if (insideRef.current) ctl.current.leave();
    pickRef.current = { kind: 'body', id: d };
    const r = routeRef.current;
    if ((r.engaged || r.waiting) && !(r.engaged && !r.waiting && routeCurrent(r) === d)) takeOver();
    target.current = d; autopilot.current = d; setDest(d);
  };
  const actions: NavActions = {
    fly: choose,
    addStop: (d) => applyRoute(routeAdd(routeRef.current, d)),
    removeStop: (i) => {
      const before = routeRef.current;
      const r = routeRemove(before, i);
      applyRoute(r);
      // The stop being flown to was removed and nothing follows: stop the autopilot there.
      if (before.engaged && !routeCurrent(r) && autopilot.current === routeCurrent(before)) autopilot.current = null;
    },
    moveStop: (i, delta) => applyRoute(routeMove(routeRef.current, i, delta)),
    tour: () => { setCard(null); applyRoute({ stops: [...TOUR_ROUTE], index: 0, engaged: true, waiting: false }); },
    clearRoute: () => {
      const r = routeRef.current;
      if (r.engaged && autopilot.current) autopilot.current = null;
      applyRoute({ ...EMPTY_ROUTE });
    },
    startRoute: () => { const r = routeRef.current; if (r.stops.length && !routeDone(r)) applyRoute({ ...r, engaged: true, waiting: false }); },
    continueRoute: () => { const r = routeRef.current; if (r.waiting) { setCard(null); applyRoute(routeContinue(r)); } },
  };
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const engage = () => {
    const r = routeRef.current;
    const cur = routeCurrent(r);
    if (cur && !r.engaged && !r.waiting && target.current === cur) actions.startRoute();
    else if (target.current) autopilot.current = target.current;
  };

  useEffect(() => {
    const host = hostRef.current!;
    const stage = stageRef.current!;
    let disposed = false;
    const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    // A logarithmic depth buffer: the near plane is a hand's width from the hull and the far side of the cosmos is half a
    // million units away, which an ordinary depth buffer cannot hold without the planets flickering through each other.
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.setClearColor(0x010208, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);
    // The cursor is always free (E1, eve-controls): no pointer lock, and the mouse never turns the ship.
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1.2 * FARTHEST);
    const sunAt = new THREE.Vector3(...SUN_POS);
    const uniforms = makeSpaceUniforms();
    // Every draw is made rebased on the camera, so nothing the GPU sees is far from the origin (space/origin.ts).
    const origin = createRenderOrigin(scene, camera);
    origin.world(uniforms.uSun);
    const drawFrame = (dt: number) => origin.render(() => composer.render(dt));
    let world: ReturnType<typeof buildVoyageScene> | null = null;
    let extras: { update: (dt: number, time: number, camera: THREE.Camera) => void }[] = [];
    let targets: Target[] = [];
    let armourLayer: ArmourLayer | null = null;

    // Something for the ship's metal and glass to reflect.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    // Bloom lets the Sun, the engines and the brightest stars glow; tone mapping keeps it filmic.
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.4, 1.35);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const combat = createCombat(scene, () => geoRef.current, { uniforms, shipScale: SHIP });
    combatRef.current = combat;
    const fleet = createFleetCommand(scene, combat, () => geoRef.current, () => hooksRef.current?.level?.() ?? 1);
    fleetRef.current = fleet;
    setFleetReady(true);
    const ext = hooksRef.current?.attach({ combat, shipScale: SHIP, scene, world: () => world, geo: () => geoRef.current });
    combat.arsenal.setScale(SHIP / 0.18); // munitions were sized for SHIP 0.18: they follow the ship's size
    combat.arsenal.setLoadout(loadoutRef.current);
    // Dev only: the ship-type proving range (destroyer thread), driven from window.__voyage.duel.
    const duel = import.meta.env.DEV ? createDuel(scene, { uniforms, playerLength: SHIP_MODEL_LENGTH * SHIP }) : null;
    // Drone swarms (keys 7, 8, 9, 0): the player's racks and every hostile carrier's.
    const swarms = createSwarms(scene, combat, { shipScale: SHIP, camera, quality: () => flightRef.current?.quality ?? 'high' });
    // Atmospheres: flying down into the air, near the ground, and out again (components/planet).
    const air = createPlanetAir(scene, uniforms, () => world, { maxYaw: MAX_YAW, maxPitch: MAX_PITCH, shipLength: 2.06 * SHIP, shipScale: SHIP });

    const pilotShip = pilotLook ? buildPilotShip(pilotLook.nation, pilotLook.ship, loadoutRef.current) : null;
    const shipModel = pilotShip ?? buildShip(uniforms);
    pilotShipRef.current = pilotShip;
    const shipObj = shipModel.group;
    if (!pilotLook) { const n = NATIONS.find((x) => x.player); if (n) dressAsNation(shipObj, n); } // without the opening's ship, the player flies their nation's cruiser
    let boostingNow = false; // the frame's boost, for the tutorial's probe
    shipObj.scale.setScalar(SHIP);
    scene.add(shipObj);
    const gfx = FX.createGraphics({ renderer, scene, composer, bloom, shipObj, nozzles: shipModel.nozzles, shipScale: SHIP });
    for (const u of gfx.worldUniforms) origin.world(u);

    // Start just outside the outermost shell around Earth, facing the Moon.
    const moonLon = (LAYOUT.moon * Math.PI) / 180;
    const ship = {
      pos: new THREE.Vector3(Math.cos(moonLon) * 12 * COSMOS, 0.6 * COSMOS, -Math.sin(moonLon) * 12 * COSMOS),
      yaw: 0, pitch: 0, roll: 0, speed: 0,
      yawRate: 0, pitchRate: 0, // smoothed turn rates, so steering eases in and out
      vel: new THREE.Vector3(), // actual motion
      push: 0, // engine effort 0..1, for the exhaust
    };
    {
      const to = new THREE.Vector3(Math.cos(moonLon) * VR.moon, 0, -Math.sin(moonLon) * VR.moon).sub(ship.pos);
      ship.yaw = Math.atan2(-to.x, -to.z);
      ship.pitch = Math.asin(clamp(to.y / to.length(), -1, 1));
    }
    // The camera (E2, controls/eve.ts): with a mouse it orbits the ship and stays where it was left in the world (left-drag
    // swings it round, right button + wheel or +/- zoom); the ship turning does not move it. On a touch screen it trails
    // the nose as before. `pull` is the speed's own pull-back, `zoom` the player's.
    const cam = { yaw: ship.yaw, pitch: ship.pitch + EVE.pitch0, pull: 1, zoom: 1 };
    // The held heading (E3, controls/aim.ts): a world direction the ship turns toward at its own rates and holds. A
    // double-click in space sets it; the mouse never moves it. 'stick' while the arrow keys, a gamepad or the touch
    // joystick turn the ship (the heading rides on the nose, and is held from where the turn left it).
    const noseDir = (): V3 => shipAxes(ship.yaw, ship.pitch).fwd;
    const aim = { dir: noseDir(), mode: (touch ? 'stick' : 'heading') as 'heading' | 'stick' };
    // The last double-click: the direction and when, for its marker.
    const flyMark = { dir: null as V3 | null, at: -1e9 };
    const upNow = (): V3 => air.up ?? [0, 1, 0];
    // Side and vertical thrusters (R3, controls/thrust.ts): the ship's sideways and upward speed in its own frame.
    let lat: Lateral = { x: 0, y: 0 };
    const dodge = newDodge();
    const taps = new Map<string, number>();
    const resetAim = () => { aim.dir = noseDir(); lat = { x: 0, y: 0 }; cam.yaw = ship.yaw; cam.pitch = clamp(ship.pitch + EVE.pitch0, -EVE.pitchLimit, EVE.pitchLimit); flyMark.dir = null; };
    const startPose = { pos: ship.pos.clone(), yaw: ship.yaw, pitch: ship.pitch }; // where a lost ship comes back
    let lostT = 0;
    let respawnAt: StationId | null = null; // GP-15a: the held station a lost ship comes back at (null: the start)
    const sp = spawnRef.current;
    if (sp) {
      ship.pos.fromArray(migratePos(sp.pos, sp.scale));
      ship.yaw = sp.yaw;
      ship.pitch = sp.pitch;
      resetAim();
      if (sp.target) { target.current = sp.target as Dest; setDest(sp.target as Dest); }
      const r = routeFromSave(sp.route);
      if (r.stops.length) { applyRoute(r); if (r.waiting) setCard(routeCurrent(r)); }
    }
    // ---- Entering a body: turn to it, fly slowly in through a wash of its colour, then its display ----
    // `pose` is where the ship went in; leaving puts it back there, and the orbit takes it up again.
    let entry: { id: Dest; phase: 'in' | 'inside' | 'out'; t: number; gap0: number; pose: { pos: THREE.Vector3; yaw: number; pitch: number }; vias?: THREE.Vector3[] } | null = null;
    let here: Dest | null = null; // what Enter would go into: the arrival, or the body being orbited
    const wash = (o: number, id?: Dest) => {
      const w = washRef.current;
      if (!w) return;
      if (id) { const [a, b] = washColor(id); w.style.background = `radial-gradient(circle at 50% 50%, ${a} 0%, ${b} 75%)`; }
      w.style.opacity = String(o);
      w.style.display = o > 0.001 ? 'block' : 'none';
    };
    const goInside = (id: Dest, pose: { pos: THREE.Vector3; yaw: number; pitch: number }) => {
      entry = { id, phase: 'inside', t: 0, gap0: 1, pose };
      insideRef.current = id;
      setInside(id);
      wash(1, id);
    };
    const startEntry = (id: Dest | null) => {
      if (!id || entry || dock || isStation(id)) return; // a station is docked at, not entered
      const g = geoRef.current.find((x) => x.id === id);
      if (!g) return;
      air.leaveQuietly(ship);
      const rr = routeRef.current;
      if (rr.engaged && !rr.waiting) takeOver();
      autopilot.current = null;
      throttle.current = 0;
      boost.current = false;
      planRef.current = null;
      keys.current.clear(); stick.current.x = 0; stick.current.y = 0;
      setCard(null);
      const gap = Math.max(0.05, ship.pos.distanceTo(new THREE.Vector3(...g.pos)) - g.size);
      entry = { id, phase: 'in', t: 0, gap0: gap, pose: { pos: ship.pos.clone(), yaw: ship.yaw, pitch: ship.pitch }, vias: entryVias(id) };
      wash(0, id);
    };
    const leave = () => {
      if (!entry || entry.phase === 'out') return;
      ship.pos.copy(entry.pose.pos);
      ship.yaw = entry.pose.yaw;
      ship.pitch = entry.pose.pitch;
      ship.speed = 0; ship.vel.set(0, 0, 0); ship.yawRate = 0; ship.pitchRate = 0;
      throttle.current = 0;
      cam.yaw = ship.yaw; cam.pitch = ship.pitch;
      resetAim();
      camera.position.copy(camGoal());
      keys.current.clear(); stick.current.x = 0; stick.current.y = 0;
      entry = { ...entry, phase: 'out', t: 0 };
      insideRef.current = null;
      setInside(null);
      wash(1);
    };
    ctl.current = { enter: () => startEntry(here), leave };

    // ---- Docking at a berth on the god armour: to the approach point, then down into the cradle; undocking puts the
    // ship back at the approach point, nose out. The berth is the station: its screen opens when the ship is in. ----
    const places = new Map(stationPlaces(SHIP_LENGTH).map((s) => [s.id, s]));
    // Station systems: guns, shields, the hangar, the market (lib/station/), on provisional mounts until god-armour's.
    const stationDef = stationDefRef.current = createStationDefense(combat, { places: [...places.values()], geo: () => geoRef.current, shipLength: SHIP_LENGTH, hull: () => combat.arsenal.player.def.hull, setHull: setHullBoth });
    let dock: { id: StationId; phase: 'in' | 'docked'; t: number; from: THREE.Vector3; yaw: number; pitch: number } | null = null;
    let dockableNow: StationId | null = null;
    const V = (p: V3) => new THREE.Vector3(...p);
    const poseOf = (d: THREE.Vector3) => ({ yaw: Math.atan2(-d.x, -d.z), pitch: Math.asin(clamp(d.y / Math.max(d.length(), 1e-9), -1, 1)) });
    /** At the berth's approach point, nose out, clear of the plating. */
    const undockPose = (id: StationId) => {
      const p = places.get(id)!;
      return { pos: V(p.pos), ...poseOf(V(p.out)) };
    };
    const clearOf = (id: StationId, pose: ReturnType<typeof undockPose>) => {
      const p = places.get(id)!;
      const size = geoRef.current.find((g) => g.id === id)?.size ?? 4;
      return { ...pose, pos: pose.pos.clone().addScaledVector(V(p.out).normalize(), size * 2 + 20 * SHIP_LENGTH) };
    };
    /** In the cradle: the ship rests a little over the pad, level with the plating, nose along the berth's north. */
    const cradlePose = (id: StationId) => {
      const p = places.get(id)!;
      const out = V(p.out);
      const north = new THREE.Vector3(0, 1, 0).sub(out.clone().multiplyScalar(out.y));
      if (north.lengthSq() < 1e-6) north.set(1, 0, 0);
      return { pos: V(p.cradle).addScaledVector(out, BERTH.cradle * SHIP_LENGTH), ...poseOf(north.normalize()) };
    };
    const goDocked = (id: StationId) => {
      const c = cradlePose(id);
      dock = { id, phase: 'docked', t: 0, from: ship.pos.clone(), yaw: c.yaw, pitch: c.pitch };
      ship.pos.copy(c.pos); ship.yaw = c.yaw; ship.pitch = c.pitch;
      ship.speed = 0; ship.vel.set(0, 0, 0);
      setDocked(id); setDockable(null); setCard(null);
      wash(1, id);
    };
    const startDock = (id?: StationId) => {
      const sid = id ?? dockableNow;
      if (!sid || sid !== dockableNow || dock || entry) return; // only from within reach of the berth
      if (stationDef.refuses(sid)) return; // it is fighting you
      const rr = routeRef.current;
      if (rr.engaged && !rr.waiting) takeOver();
      autopilot.current = null; throttle.current = 0; boost.current = false; planRef.current = null; firing.current = false;
      keys.current.clear(); stick.current.x = 0; stick.current.y = 0;
      setCard(null);
      dock = { id: sid, phase: 'in', t: 0, from: ship.pos.clone(), yaw: ship.yaw, pitch: ship.pitch };
      wash(0, sid);
      dbg.docks.push(sid);
    };
    /** One frame of the docking run: to the approach point, turning out of the way in, then straight down into the cradle. */
    const stepDock = (dt: number) => {
      const d = dock!;
      d.t += dt;
      const p = places.get(d.id)!;
      const approach = V(p.pos);
      const cr = cradlePose(d.id);
      const k = clamp(d.t / DOCK_IN, 0, 1);
      const ease = (x: number) => x * x * (3 - 2 * x);
      if (k < 0.4) ship.pos.copy(d.from).lerp(approach, ease(k / 0.4)); else ship.pos.copy(approach).lerp(cr.pos, ease((k - 0.4) / 0.6));
      const turn = 1 - Math.exp(-dt * 4);
      const wantYaw = k < 0.4 && approach.distanceTo(ship.pos) > 0.05 ? poseOf(approach.clone().sub(ship.pos)).yaw : cr.yaw;
      const wantPitch = k < 0.4 && approach.distanceTo(ship.pos) > 0.05 ? poseOf(approach.clone().sub(ship.pos)).pitch : cr.pitch;
      ship.yaw = wrapPi(ship.yaw + wrapPi(wantYaw - ship.yaw) * turn);
      ship.pitch += (wantPitch - ship.pitch) * turn;
      ship.speed = 0; ship.vel.set(0, 0, 0); ship.yawRate = 0; ship.pitchRate = 0; ship.push = 0.2;
      wash(Math.max(0, (k - 0.75) / 0.25) ** 1.6);
      if (k >= 1) goDocked(d.id);
    };
    const undock = () => {
      if (dock?.phase !== 'docked') return;
      const id = dock.id;
      const pose = undockPose(id);
      dock = null;
      ship.pos.copy(pose.pos); ship.yaw = pose.yaw; ship.pitch = pose.pitch;
      ship.speed = 0; ship.vel.set(0, 0, 0); ship.yawRate = 0; ship.pitchRate = 0;
      throttle.current = 0;
      cam.yaw = ship.yaw; cam.pitch = ship.pitch;
      resetAim();
      camera.position.copy(camGoal());
      keys.current.clear(); stick.current.x = 0; stick.current.y = 0;
      setDocked(null);
      entry = { id, phase: 'out', t: 0, gap0: 1, pose }; // the wash fades as it does leaving a body
      wash(1);
    };
    dockCtl.current = { dock: startDock, undock };
    if (sp && isDest(sp.inside)) goInside(sp.inside, { pos: ship.pos.clone(), yaw: ship.yaw, pitch: ship.pitch });
    if (sp && isStation(sp.docked)) goDocked(sp.docked);
    if (sp && typeof sp.hull === 'number') setHullBoth(sp.hull);
    /** One frame of going in: face the body, close the gap (slower as it shrinks), the wash rising with it. */
    const stepEntry = (dt: number) => {
      const e = entry!;
      if (e.vias?.length) {
        // Round the armour first: over a window in the plating, then down through it.
        const to = e.vias[0].clone().sub(ship.pos);
        const d = to.length();
        const turn = 1 - Math.exp(-dt * 3);
        ship.yaw = wrapPi(ship.yaw + wrapPi(Math.atan2(-to.x, -to.z) - ship.yaw) * turn);
        ship.pitch += (Math.asin(clamp(to.y / Math.max(d, 1e-6), -1, 1)) - ship.pitch) * turn;
        ship.yawRate = 0; ship.pitchRate = 0;
        ship.speed = clamp(d * 1.5, 2, COSMOS); // the cap follows the world's scale (6,000 at 200 m ships)
        ship.push = 0.6;
        ship.pos.addScaledVector(to.normalize(), Math.min(ship.speed * dt, d));
        ship.vel.copy(to).multiplyScalar(ship.speed);
        if (d < Math.max(0.5, ship.speed * dt * 1.01)) e.vias.shift();
        return;
      }
      const g = geoRef.current.find((x) => x.id === e.id)!;
      const to = new THREE.Vector3(...g.pos).sub(ship.pos);
      const d = to.length();
      const gap = Math.max(0, d - g.size);
      const turn = 1 - Math.exp(-dt * 3);
      ship.yaw = wrapPi(ship.yaw + wrapPi(Math.atan2(-to.x, -to.z) - ship.yaw) * turn);
      ship.pitch += (Math.asin(clamp(to.y / Math.max(d, 1e-6), -1, 1)) - ship.pitch) * turn;
      ship.yawRate = 0; ship.pitchRate = 0;
      const facing = forwardOf(ship.yaw, ship.pitch).dot(to) / Math.max(d, 1e-6);
      ship.speed = facing > 0.9 ? Math.max(gap * 0.9, 0.35 + g.size * 0.02) : 0.05;
      ship.push = 0.25;
      const dir = to.normalize();
      ship.pos.addScaledVector(dir, Math.min(ship.speed * dt, gap));
      ship.vel.copy(dir).multiplyScalar(ship.speed);
      const k = clamp(1 - gap / e.gap0, 0, 1);
      wash(Math.pow(k, 1.6));
      if (gap <= 0.002 + g.size * 0.002) goInside(e.id, e.pose);
    };
    const camOffset = () => (camera.aspect < 0.8 ? new THREE.Vector3(0, 1.7, 6.4) : new THREE.Vector3(0, 1.25, 4.6)).multiplyScalar(SHIP * cam.pull * (fleet.hull === 'capital' ? CAPITAL_CAM : 1));
    const camGoal = () => camOffset()
      .applyEuler(new THREE.Euler(cam.pitch * 0.7, cam.yaw, 0, 'YXZ'))
      .add(ship.pos);
    camera.position.copy(camGoal());

    // Labels need the fonts before they are drawn to canvas.
    Promise.all([
      document.fonts.load(`64px ${LABEL_FONT}`, 'MARS'),
    ]).catch(() => undefined).then(() => {
      if (disposed) return;
      world = buildVoyageScene(scene, uniforms);
      const moons = buildMoons(scene, geoRef.current, uniforms);
      const stations = buildArmour(scene, geoRef.current, SHIP_LENGTH, flightRef.current?.quality ?? 'high', (id) => world?.bodyFrame(id));
      armourLayer = stations;
      extras = [moons, stations];
      world.pickables.push(...moons.pickables, ...stations.pickables);
      targets = [...world.targets, ...moons.targets, ...stations.targets];
      worldRef.current = world;
    });

    let arrivedAt: Dest | null = null;
    let zone: SphereId = zoneOf(ship.pos.toArray() as V3);
    let lastHud = 0;
    let last = performance.now();
    let bannerN = 0;
    const padPrev = { a: false, b: false };
    const dbg = { limit: 0, want: 0, near: 0, hits: 0, minGap: Infinity, parks: [] as string[], orbit: null as unknown, armourHits: 0, armourContacts: 0, armourMin: Infinity, docks: [] as string[], autoDocks: [] as string[] };
    let pausedDrawn = false;
    let phase: Phase | null = null;
    // Orbit: with the engines off near a body, the ship circles it. Eased in and out so it never jerks.
    let orbitK = 0;
    let orbitId: Dest | null = null;
    let lap: number | null = null;
    let legs: LegPlan[] = [];
    let lastLegs = 0;
    let lastMini = 0;
    let inArc = true; // the crosshair is within the gun arc (R5)
    // Hit feel (R12): the arsenal's counts of the player's hits landed and hits taken, as last seen.
    const feel = { landed: 0, hurt: 0, hitAt: -9, hurtAt: -9, kick: 0 };
    const posV = () => ship.pos.toArray() as V3;
    const pickedShip = () => { const pk = pickRef.current; return pk?.kind === 'ship' ? pk.id : null; };
    /** The picked target now: where it is, how it moves, and its radius (a body's surface is where distances start). */
    const pickedPose = (): { pos: V3; vel: V3; size: number; name: string } | null => {
      const pk = pickRef.current;
      if (!pk) return null;
      if (pk.kind === 'ship') {
        const c = combat.crafts.find((x) => x.id === pk.id && x.alive);
        return c ? { pos: c.pos, vel: c.vel, size: c.radius, name: craftName(c) } : null;
      }
      const g = geoRef.current.find((x) => x.id === pk.id);
      return g ? { pos: g.pos, vel: [0, 0, 0], size: g.size, name: DEST_LABEL[pk.id] } : null;
    };
    const craftName = (c: (typeof combat.crafts)[number]) => {
      const n = NATIONS.find((x) => x.id === c.nation)!;
      return `${n.name} ${RACE_REFS.find((r) => r.nation === c.nation)?.ships[c.type] ?? c.type}`;
    };
    /** A stance's distance until it is scrolled: half the selected weapon's reach from a ship, half the radius from a body. */
    const defaultDist = () => {
      const pk = pickRef.current;
      if (pk?.kind === 'body') return (geoRef.current.find((x) => x.id === pk.id)?.size ?? 10) * 0.5;
      return combat.arsenal.munition(weaponRef.current).range * 0.5;
    };
    const pickShip = (id: number) => { pickRef.current = { kind: 'ship', id }; };
    /**
     * E6: the active locked ship (locks take hostile ships only) is the guns' target. Its acceleration is
     * read from its velocity frame to frame (eased over about 0.1 s), so the lead can follow a ship in a turn.
     */
    const track = { id: -1, vel: [0, 0, 0] as V3, acc: [0, 0, 0] as V3 };
    const gunTarget = (dt: number, c: (typeof combat.crafts)[number] | undefined): { pos: V3; vel: V3; acc: V3 } | null => {
      if (!c || !c.alive) return null;
      const vel: V3 = c.vel ?? [0, 0, 0];
      if (track.id !== c.id || dt <= 0 || dt > 0.5) { track.acc = [0, 0, 0]; }
      else { const e = 1 - Math.exp(-dt / 0.1); track.acc = track.acc.map((a, i) => a + ((vel[i] - track.vel[i]) / dt - a) * e) as V3; }
      track.id = c.id; track.vel = [...vel];
      return { pos: c.pos, vel, acc: track.acc };
    };
    const pickBody = (id: Dest) => { pickRef.current = { kind: 'body', id }; target.current = id; setDest(id); };
    /** What lies along a ray (E4, controls/targets.ts): a ship, else the nearest body or station, else nothing. */
    const pickRay = (from: V3, dir: V3): Picked | null => pickAlong(from, dir,
      combat.crafts.filter((c) => c.alive).map((c) => ({ id: c.id, pos: c.pos, radius: c.radius })),
      geoRef.current.map((g) => ({ id: g.id, pos: g.pos, size: g.size })), 40000);
    const keyOf = (pk: Picked) => (pk.kind === 'ship' ? `s${pk.id}` : `b${pk.id}`);
    /** Select (E4): a ship by its id, or a body or station (which is also the autopilot's target). */
    const selectKey = (key: string) => {
      if (key.startsWith('s')) pickShip(+key.slice(1)); else pickBody(key.slice(1) as Dest);
      stanceRef.current.dist = null;
    };
    /**
     * The pick action (middle click, or a key put on it): what is under the cursor, or with no cursor point (a key)
     * what lies along the nose. Nothing there clears the selection.
     */
    const pickUnder = (dir?: V3, from?: V3) => {
      const pk = pickRay(from ?? (dir ? camera.position.toArray() as V3 : posV()), dir ?? noseDir());
      if (pk) { selectKey(keyOf(pk)); return; }
      pickRef.current = null;
      stanceRef.current.mode = null;
      flash(dir ? 'Nothing there' : 'Nothing ahead');
    };
    /** A distance from the ship to a selection's surface (a ship's centre). */
    const selDist = (pos: V3, size: number) => Math.max(0, Math.hypot(pos[0] - ship.pos.x, pos[1] - ship.pos.y, pos[2] - ship.pos.z) - size);
    const lockState = (id: number): SelInfo['lock'] => { const l = locksRef.current.locks.find((x) => x.id === id); return !l ? 'none' : l.locked ? 'locked' : 'locking'; };
    /** The selected-item panel's contents (E4). */
    const selInfo = (key?: string): SelInfo | null => {
      const pk = key ? (key.startsWith('s') ? { kind: 'ship' as const, id: +key.slice(1) } : { kind: 'body' as const, id: key.slice(1) as Dest }) : pickRef.current;
      if (!pk) return null;
      if (pk.kind === 'ship') {
        const c = combat.crafts.find((x) => x.id === pk.id && x.alive);
        if (!c) return null;
        const n = NATIONS.find((x) => x.id === c.nation)!;
        return { key: `s${c.id}`, name: craftName(c), sub: `${c.type} · ${n.name}${c.hostile ? ' · hostile' : ''}`, dist: fmtDist(selDist(c.pos, 0)), vel: `${Math.hypot(...c.vel).toFixed(1)} u/s`, ship: true, hostile: c.hostile, lock: lockState(c.id), dock: false, enter: false };
      }
      const g = geoRef.current.find((x) => x.id === pk.id);
      if (!g) return null;
      const id = pk.id as Dest;
      return { key: `b${id}`, name: DEST_LABEL[id] ?? id, sub: isStation(id) ? 'station' : g.kind ?? 'body', dist: fmtDist(selDist(g.pos, g.size)), vel: '0 u/s', ship: false, hostile: false, lock: 'none', dock: isStation(id) && dockableNow === id, enter: !isStation(id) && here === id };
    };
    /** Ctrl+click, the Lock button or the lock key (E6): start a lock on a hostile ship. */
    const lockShip = (id: number) => {
      const c = combat.crafts.find((x) => x.id === id && x.alive);
      if (!c) return;
      if (!c.hostile) { flash('Only hostile ships can be locked'); return; }
      const r = startLock(locksRef.current, id);
      flash(r === 'ok' ? `Locking ${craftName(c)}` : r === 'full' ? `Three locks already held: unlock one first` : `${craftName(c)}: already locked`);
    };
    /**
     * Switch the selected weapon on at the active target (E6), as an EVE module: it fires at its own rate until switched
     * off, the target is lost, or the slot changes. A laser with no lock fires along the nose; a munition that needs a
     * lock refuses without one. `toggle` false only switches on (a click on the target).
     */
    const activateWeapon = (toggle = true) => {
      if (!isWeaponSlot(slotRef.current)) return;
      const w = loadoutRef.current.weapons[slotRef.current];
      if (!w) { flash('Empty slot'); return; }
      const on = weaponOn.current;
      if (on.on && toggle) { weaponOn.current = { on: false, target: null }; flash(`${MUNITIONS[w].name}: off`); return; }
      const act = activeLock(locksRef.current);
      if (MUNITIONS[w].lock === 'required' && !act) { flash(`${MUNITIONS[w].name} needs a lock: Ctrl+click a hostile ship`); return; }
      weaponOn.current = { on: true, target: act?.id ?? null };
      const c = act ? combat.crafts.find((x) => x.id === act.id) : undefined;
      flash(c ? `${MUNITIONS[w].name}: firing at ${craftName(c)}` : `${MUNITIONS[w].name}: firing ahead`);
    };
    lockIconRef.current = {
      // A lock's icon: the first click makes it the active target, a click on the active one fires on it.
      click: (id: number) => {
        if (locksRef.current.active === id) { activateWeapon(false); return; }
        if (!setActive(locksRef.current, id)) { flash('Still locking'); return; }
        if (weaponOn.current.on) weaponOn.current = { on: false, target: null };
        selectKey(`s${id}`);
      },
      unlock: (id: number) => { unlock(locksRef.current, id); if (weaponOn.current.target === id) weaponOn.current = { on: false, target: null }; },
      ovLock: (key: string) => { if (key.startsWith('s')) lockShip(+key.slice(1)); else flash('Only ships can be locked'); },
    };
    apiSel.current = () => { pickRef.current = null; stanceRef.current.mode = null; lookKey = null; setHud((h) => ({ ...h, sel: null })); };
    /** Look at (E4): the camera swings to put the target behind the ship, in the middle of the view, and follows it. */
    let lookKey: string | null = null;
    /** The panel's and the menu's actions (E4, E5), on the selection or the key given. */
    selActRef.current = (a: SelAction, key?: string) => {
      const k = key ?? (pickRef.current ? (pickRef.current.kind === 'ship' ? `s${pickRef.current.id}` : `b${pickRef.current.id}`) : null);
      if (!k) return;
      if (a === 'lock') { lockShip(+k.slice(1)); return; }
      if (a === 'unlock') { lockIconRef.current.unlock(+k.slice(1)); flash('Unlocked'); return; }
      if (a === 'look') { lookKey = k; return; }
      selectKey(k);
      const id = k.slice(1);
      if (a === 'approach' || a === 'orbit' || a === 'range') {
        stanceRef.current.mode = a;
        autopilot.current = null;
        takeOver();
        flash(`${STANCE_LABEL[a]}: ${pickedPose()?.name ?? ''}`);
        return;
      }
      if (a === 'dock' && isStation(id)) { startDock(id); return; }
      if (a === 'enter') { startEntry(id as Dest); return; }
      if (a === 'fly') {
        if (k.startsWith('s')) {
          const p = pickedPose();
          if (!p) return;
          const d = sub(p.pos, posV());
          const l = Math.hypot(...d);
          if (l < 1e-9) return;
          aim.dir = scale(d, 1 / l); aim.mode = 'heading';
          stanceRef.current.mode = null;
          if (autopilot.current) { autopilot.current = null; throttle.current = throttleOf(ship.speed); }
          takeOver();
          throttle.current = flyCommand(throttle.current);
          flash(`Flying toward ${p.name}`);
        } else { stanceRef.current.mode = null; choose(id as Dest); target.current = id as Dest; engage(); flash(`Autopilot: ${DEST_LABEL[id as Dest]}`); }
      }
    };
    /** The overview's rows: the nearest contacts, hostiles first (R9). */
    const overviewRows = (): OverviewRow[] => {
      const me = posV();
      const pk = pickRef.current;
      const ships = combat.crafts.filter((c) => c.alive).map((c) => {
        const b = combat.ai.brains.get(c.id);
        const lk = c.hostile && b ? (b.lock >= 1 ? 'LOCKED' as const : b.lock > 0.05 ? 'locking' as const : '' as const) : '' as const;
        return { key: `s${c.id}`, name: craftName(c), cls: c.type, d: Math.hypot(c.pos[0] - me[0], c.pos[1] - me[1], c.pos[2] - me[2]), hostile: c.hostile, locking: lk };
      });
      const bodies = ovFilterRef.current === 'all' ? geoRef.current.map((g) => ({
        key: `b${g.id}`, name: DEST_LABEL[g.id as Dest] ?? g.id, cls: g.kind ?? 'body', d: Math.max(0, Math.hypot(g.pos[0] - me[0], g.pos[1] - me[1], g.pos[2] - me[2]) - g.size), hostile: false, locking: '' as const,
      })) : [];
      const pkKey = pk ? (pk.kind === 'ship' ? `s${pk.id}` : `b${pk.id}`) : '';
      const order = (a: { hostile: boolean; d: number }, b: { hostile: boolean; d: number }) => (a.hostile === b.hostile ? a.d - b.d : a.hostile ? -1 : 1);
      // Ships first, hostiles first; with Everything the five nearest bodies and stations follow.
      return [...ships.sort(order).slice(0, bodies.length ? 9 : 14), ...bodies.sort(order).slice(0, 5)]
        .map((r) => ({ key: r.key, name: r.name, cls: r.cls, dist: fmtDist(r.d), hostile: r.hostile, locking: r.locking, picked: r.key === pkKey, mine: r.key.startsWith('s') ? lockState(+r.key.slice(1)) : 'none' }));
    };
    ovPickRef.current = (key: string) => {
      if (key.startsWith('s')) pickShip(+key.slice(1)); else pickBody(key.slice(1) as Dest);
      stanceRef.current.dist = null;
      setHud((h) => ({ ...h, ov: overviewRows() }));
    };
    /** R: pressed, then let go. A tap cycles the stance; holding it lets the wheel set the distance (R8). */
    const stanceDown = () => { const st = stanceRef.current; if (st.rAt === null) { st.rAt = performance.now() / 1000; st.scrolled = false; } };
    const stanceUp = () => {
      const st = stanceRef.current;
      const held = st.rAt === null ? 0 : performance.now() / 1000 - st.rAt;
      st.rAt = null;
      if (st.scrolled || held > STANCE.tap) return;
      if (!pickRef.current) {
        // Nothing picked: the locked ship, or the one under the crosshair, becomes the target.
        const c = combat.lock?.craft ?? combat.aim?.craft;
        if (c) pickShip(c.id); else { flash(`Pick a target first (${keyLabel(binds().pick).toLowerCase()})`); return; }
      }
      st.mode = nextStance(st.mode);
      if (st.mode) { autopilot.current = null; takeOver(); }
      flash(st.mode ? `${STANCE_LABEL[st.mode]}: ${pickedPose()?.name ?? ''}` : 'Stance off');
    };
    /** A station in docking range or a body in entering range under the crosshair: what right click opens (R6). */
    const useTarget = (): (() => void) | null => {
      if (entry || dock) return null;
      const dir = camera.getWorldDirection(new THREE.Vector3());
      const on = (id: string) => {
        const g = geoRef.current.find((x) => x.id === id);
        if (!g) return false;
        const to = new THREE.Vector3(...g.pos).sub(camera.position);
        const d = to.length();
        return to.angleTo(dir) <= Math.max(Math.asin(Math.min(1, g.size / Math.max(d, 1e-6))), 0.06);
      };
      if (dockableNow && on(dockableNow)) { const id = dockableNow; return () => startDock(id); }
      if (here && !isStation(here) && on(here)) { const id = here; return () => startEntry(id); }
      return null;
    };
    /** The fire, use (right click) and pick buttons, from the mouse or whatever key they are put on. */
    const clickDown = (act: Action) => {
      if (pausedRef.current || navRef.current) return;
      if (act === 'fire') {
        firing.current = true;
        const w = loadoutRef.current.weapons[slotRef.current];
        if (isWeaponSlot(slotRef.current) && !w) flash('Empty slot');
        else if (isWeaponSlot(slotRef.current) && MUNITIONS[w].lock === 'required' && !activeLock(locksRef.current)) flash('Needs a lock: Ctrl+click a hostile ship');
        return;
      }
      if (act === 'pick') { pickUnder(); return; }
      if (act !== 'use') return;
      const t = useTarget();
      if (t) { t(); return; } // as right click opens a chest: dock, or go in
      const kind = SLOT_KINDS[slotRef.current];
      const a = combat.arsenal;
      if (kind === 'weapon') {
        const w = loadoutRef.current.weapons[slotRef.current];
        if (!w) { flash('Empty slot'); return; }
        // The bow draw (mc-controls R6) is gone: EVE locks with Ctrl+click and the lock row (E6).
        if (MUNITIONS[w].lock !== 'none') { flash(`${MUNITIONS[w].name}: lock with Ctrl+click, then press ${keyLabel(binds()[`slot${slotRef.current + 1}` as Action])} again to fire`); return; }
        if (a.player.energy < GUARD.minEnergy) { flash('No energy to block'); return; }
        a.player.guard = true; // the forward shield, while held
        return;
      }
      const u = hooksRef.current?.utility?.();
      if (kind === 'swarm') { swarms.toggle(swarmRole.current); return; }
      if (kind === 'fighters') { if (!u?.fighters?.bay) flash('No fighters in the bay'); else ext?.key(u.fighters.out ? 'v' : 'b'); return; }
      if (kind === 'infantry') { if (!u?.infantry) flash('No infantry carrier'); else ext?.key(u.infantry.out ? 'k' : 'l'); return; }
      if (kind === 'repair') { flash(REPAIR_SLOT.why); return; }
      if (kind === 'counter') { if (!a.fitted.counter) flash('No countermeasure fitted'); else if (!a.countermeasure(posV(), shipAxes(ship.yaw, ship.pitch).fwd, ship.speed)) flash(a.fitted.counter === 'jammer' ? 'The jammer is always on' : a.player.counterLeft ? 'Countermeasure recharging' : 'No charges left'); }
    };
    const clickUp = (act: Action) => {
      if (act === 'fire') firing.current = false;
      if (act === 'use') {
        if (draw.current.on) { draw.current.on = false; draw.current.release = true; }
        combat.arsenal.player.guard = false;
      }
    };
    clickRef.current = { down: clickDown, up: clickUp };
    /** The hotbar's nine slots as the HUD shows them. */
    const barSlots = (): BarSlot[] => SLOT_KINDS.map((kind, i): BarSlot => {
      const a = combat.arsenal;
      // A slot the pilot cannot have yet: locked, with what opens it (GP-04).
      const gate = slotGate(i, { level: hooksRef.current?.level?.() ?? 1, hullGuns: SLOTS[fleet.hull === 'capital' ? 'capital' : 'cruiser'].weapon, counter: !!a.fitted.counter });
      const NAME: Record<typeof kind, string> = { weapon: '', swarm: 'Drones', fighters: 'Fighters', infantry: 'Infantry', repair: 'Repair', counter: 'Counter' };
      if (gate) return { label: NAME[kind] || `Gun ${i + 1}`, sub: '', empty: true, locked: true, unlock: gate.unlock, title: gate.why };
      if (kind === 'weapon') {
        const w = loadoutRef.current.weapons[i];
        if (!w) return { label: '', sub: '', empty: true, locked: false, title: `Weapon slot ${i + 1}: empty. Fit a weapon at the Shipyard.` };
        const m = MUNITIONS[w];
        const ammo = m.ammo === null ? '' : String(a.player.ammo[w] ?? 0);
        return { label: m.name.split(' ')[0], sub: ammo, empty: false, locked: false, title: `${m.name}${m.lock === 'required' ? ' (needs a lock)' : ''}` };
      }
      if (kind === 'swarm') {
        const r = swarms.rack.find((x) => x.role === swarmRole.current)!;
        const out = r.flying > 0 && r.order !== 'recall';
        const total = swarms.rack.reduce((n, x) => n + x.size, 0);
        return { label: ROLE_LABEL[r.role].split(' ')[0], sub: `${r.bay}/${r.size}`, empty: !r.size, locked: false, title: `Drone swarm (${total} drones in three racks): ${ROLE_LABEL[r.role]}, ${r.bay} of ${r.size} in the bay${out ? `, ${r.flying} out` : ''}. ${keyLabel(binds().use)} launches or recalls; ${keyLabel(binds().slot5)} again changes the rack.`, active: out };
      }
      if (kind === 'fighters') {
        const f = hooksRef.current?.utility?.().fighters ?? null;
        if (!f) return { label: 'Fighters', sub: '', empty: true, locked: false, title: 'Fighters: none in the bay. Buy one at the Shipyard.' };
        return { label: 'Fighters', sub: `${f.out}/${f.bay}`, empty: f.bay === 0, locked: false, title: `Fighters: ${f.out} of ${f.bay} out`, active: f.out > 0 };
      }
      if (kind === 'infantry') {
        const n = hooksRef.current?.utility?.().infantry ?? null;
        if (n === null) return { label: 'Infantry', sub: '', empty: true, locked: false, title: 'Infantry carrier: not carried' };
        return { label: 'Infantry', sub: n.out ? 'out' : '', empty: false, locked: false, title: n.out ? `Infantry carrier: ${n.out} out` : 'Infantry carrier: ready to land troops', active: n.out > 0 };
      }
      if (kind === 'repair') return { label: 'Repair', sub: '', empty: false, locked: REPAIR_SLOT.locked, title: REPAIR_SLOT.why };
      const c = a.fitted.counter!;
      return { label: COUNTERS[c].name.split(' ').pop()!, sub: c === 'jammer' ? 'on' : String(a.player.counterLeft), empty: false, locked: false, title: `${COUNTERS[c].name}${c === 'jammer' ? ' (always on)' : `: ${a.player.counterLeft} left`}` };
    });
    countermeasureRef.current = () => { combat.arsenal.countermeasure(posV(), shipAxes(ship.yaw, ship.pitch).fwd, ship.speed); };
    /** The rest of the route (or the single autopilot leg), planned from where the ship is now. */
    const computeLegs = (): LegPlan[] => {
      const r = routeRef.current;
      const fwd = shipAxes(ship.yaw, ship.pitch).fwd;
      if (r.stops.length && !routeDone(r)) {
        const from = r.waiting ? r.index + 1 : r.index;
        return planRoute(posV(), fwd, r.stops, from, geoRef.current, r.engaged && !r.waiting ? ship.speed : 0);
      }
      return autopilot.current ? planRoute(posV(), fwd, [autopilot.current], 0, geoRef.current, ship.speed) : [];
    };
    const snapshot = (fresh: boolean): NavSnap => ({
      pos: posV(),
      vel: ship.vel.toArray() as V3,
      fwd: shipAxes(ship.yaw, ship.pitch).fwd,
      yaw: ship.yaw,
      pitch: ship.pitch,
      speed: ship.speed,
      throttle: autopilot.current ? throttleOf(ship.speed) : throttle.current,
      zone,
      auto: !!autopilot.current,
      target: target.current,
      geo: geoRef.current,
      route: routeRef.current,
      vias: planRef.current?.vias.map((v) => v.toArray() as V3) ?? [],
      legs: fresh ? computeLegs() : legs,
      phase: routeRef.current.waiting ? 'parked' : phase,
    });
    snapRef.current = () => snapshot(true);

    // ---- The god armour, for flying: the worlds' frames and grids, and a push out of any plate or mount ----
    const frames = { on: true }; // the dev hook can fly without drawing (exposed as __voyage.draw)
    let holdLeftRef: () => void = () => {}; // a left press held still fires (set with the mouse handlers below)
    /** Distance from a point to the centre of the armoured world it is within three radii of (Infinity if none). */
    const armourScale = (p: THREE.Vector3): number => {
      let best = Infinity;
      for (const h of ARMOUR_HOMES) {
        const f = armourPlaces(baseGeo, SHIP_LENGTH)[h].frame;
        const d = p.distanceTo(V(f.centre));
        if (d < f.R * 3) best = Math.min(best, d);
      }
      return best;
    };
    const baseGeo = geoRef.current.filter((g) => !g.kind);
    const SHIP_PAD = 0.6 * SHIP_LENGTH; // the hull's reach round its centre
    const armourCollide = (prev: THREE.Vector3, low: boolean): boolean => {
      let hit = false;
      for (const h of ARMOUR_HOMES) {
        const ap0 = armourPlaces(baseGeo, SHIP_LENGTH)[h];
        const f = ap0.frame;
        const c = V(f.centre);
        const r = ship.pos.distanceTo(c);
        if (r < f.R * 3) dbg.armourMin = Math.min(dbg.armourMin, r - f.rOut); // clearance over the plating's outer radius (negative: under it)
        // The set pieces (rings, spires, wings, masts, spears) are solid too.
        const sp = armourLayer?.setPieces[h];
        const sgot = sp && setPiecePush(sp, f.centre, posV(), prev.toArray() as V3, SHIP_PAD);
        if (sgot) {
          ship.pos.set(...sgot.pos);
          dbg.armourContacts++;
          if (sgot.depth > 0.02 * SHIP_LENGTH) hit = true;
        }
        if (r > f.rOut + ap0.skin + SHIP_PAD * 2 || r < f.rIn - SHIP_PAD * 2) continue;
        const g = armourGrid(f, low);
        const pushed = armourPush(f, g, posV(), prev.toArray() as V3, SHIP_PAD);
        if (pushed) {
          const depth = ship.pos.distanceTo(V(pushed));
          ship.pos.set(...pushed);
          dbg.armourContacts++;
          if (depth > 0.02 * SHIP_LENGTH) hit = true; // resting on the plate is contact; a real push back out is a hit
        }
        // Mounts: an upright cylinder each, from the plating's foot to its top.
        for (const hp of ap0.hardpoints) {
          const n = V(hp.normal);
          const foot = c.clone().addScaledVector(n, f.rIn);
          const rel = ship.pos.clone().sub(foot);
          const along = rel.dot(n);
          const top = f.rOut - f.rIn + Math.min(hp.size, ap0.skin / SHIP_LENGTH) * SHIP_LENGTH * (hp.kind === 'mooring' ? 0.8 : 0.6);
          if (along < -SHIP_PAD || along > top + SHIP_PAD) continue;
          const side = rel.clone().addScaledVector(n, -along);
          const rad = (hp.kind === 'mooring' ? 2.6 : hp.size * 0.5) * SHIP_LENGTH;
          const lat = side.length();
          if (lat > rad + SHIP_PAD) continue;
          const outTop = top + SHIP_PAD - along;
          const outSide = rad + SHIP_PAD - lat;
          if (outTop <= outSide) ship.pos.addScaledVector(n, outTop);
          else ship.pos.addScaledVector(lat > 1e-9 ? side.normalize() : V(f.ref), outSide);
          dbg.armourContacts++;
          if (Math.min(outTop, outSide) > 0.02 * SHIP_LENGTH) hit = true;
        }
      }
      return hit;
    };
    /** The nearest window in a world's plating to a direction, wide enough for the ship (open on every side), or null. */
    const windowNear = (f: ArmourFrame, g: Grid, dv: V3): THREE.Vector3 | null => {
      let best: V3 | null = null;
      let bestDot = -2;
      for (let i = 1; i < g.rings - 1; i++) {
        for (let j = 0; j < g.per[i]; j++) {
          if (g.plates[g.start[i] + j]) continue;
          const q = cellDir(f, g, i, j);
          const dd = q[0] * dv[0] + q[1] * dv[1] + q[2] * dv[2];
          if (dd <= bestDot) continue;
          const n = g.per[i];
          const up = cellIndex(f, g, cellDir(f, g, i - 1, Math.floor(((j + 0.5) / n) * g.per[i - 1])));
          const dn = cellIndex(f, g, cellDir(f, g, i + 1, Math.floor(((j + 0.5) / n) * g.per[i + 1])));
          if (g.plates[g.start[i] + ((j + 1) % n)] || g.plates[g.start[i] + ((j - 1 + n) % n)] || g.plates[up.k] || g.plates[dn.k]) continue;
          best = q; bestDot = dd;
        }
      }
      return best ? V(best) : null;
    };
    /** Is the ship over an open window here (its cell and the cells either side open)? */
    const overWindow = (f: ArmourFrame, g: Grid, dv: V3) => {
      const k = cellIndex(f, g, dv);
      return !g.plates[k.k] && [-1, 1].every((o) => !g.plates[g.start[k.i] + ((k.j + o + g.per[k.i]) % g.per[k.i])]);
    };
    /**
     * Going in to an armoured world: if the straight line down would cross plating, first fly to a point over the
     * nearest window wide enough for the ship, then down through it.
     */
    const entryVias = (id: Dest): THREE.Vector3[] => {
      if (!(ARMOUR_HOMES as string[]).includes(id)) return [];
      const ap0 = armourPlaces(baseGeo, SHIP_LENGTH)[id as ArmourHome];
      const f = ap0.frame;
      const g = armourGrid(f, flightRef.current?.quality === 'low');
      const c = V(f.centre);
      const dv = ship.pos.clone().sub(c).normalize().toArray() as V3;
      if (overWindow(f, g, dv)) return [];
      const b = windowNear(f, g, dv);
      if (!b) return [];
      return [c.clone().addScaledVector(b, f.rOut + ap0.skin + 20 * SHIP_LENGTH), c.clone().addScaledVector(b, f.rIn - 20 * SHIP_LENGTH)];
    };
    /**
     * Leaving the armour before the autopilot's path begins: from on the plating (or among its mounts), straight up
     * clear of it; from under it, across to the nearest window and up through that.
     */
    const escaping = new WeakSet<THREE.Vector3>(); // escape points must be reached, not cut: they are a few ship lengths off the plating
    const escapeVias = (): THREE.Vector3[] => {
      const out = escapeRaw();
      out.forEach((p) => escaping.add(p));
      return out;
    };
    const escapeRaw = (): THREE.Vector3[] => {
      for (const h of ARMOUR_HOMES) {
        const ap0 = armourPlaces(baseGeo, SHIP_LENGTH)[h];
        const f = ap0.frame;
        const c = V(f.centre);
        const r = ship.pos.distanceTo(c);
        const top = f.rOut + ap0.skin + BERTH.margin * SHIP_LENGTH;
        if (r >= top || r < f.R) continue;
        const d = ship.pos.clone().sub(c).normalize();
        const up = (dir: THREE.Vector3) => c.clone().addScaledVector(dir, top + 20 * SHIP_LENGTH);
        if (r > f.rIn - 2 * SHIP_PAD) return [up(d)];
        const g = armourGrid(f, flightRef.current?.quality === 'low');
        const dv = d.toArray() as V3;
        if (overWindow(f, g, dv)) return [up(d)];
        const w = windowNear(f, g, dv);
        return w ? [c.clone().addScaledVector(w, f.rIn - 20 * SHIP_LENGTH), up(w)] : [up(d)];
      }
      return [];
    };
    // ---- Hyperspace (scale-jump-danger J1-J3): J, the HUD's Jump button, or the autopilot on a long leg ----
    const hyper = createHyperspace(scene);
    let jumpTry = 0; // when the autopilot last tried to take a long leg by jump
    /** The body a destination sits at (a berth's world; a moon, a planet or the Sun itself). */
    const bodyOf = (id: Dest): DestGeo | undefined => { const st = stationById(id); return geoRef.current.find((g) => g.id === (st ? st.home : id)); };
    /**
     * Whatever would fight you or is challenging you (its house's fleet not holding fire), with its guns' reach: the drop
     * keeps out of all of their ranges. Only those weapons free on you (attitude 'engage') are armed for the mass lock,
     * so a challenged ship can still jump out as it is told to.
     */
    const hostilesNow = (): Hostile[] => {
      const att = (n: string) => combat.ai.hooks.attitudeOf?.(n) ?? (NATIONS.find((x) => x.id === n)?.player ? 'hold' : 'engage');
      const out: Hostile[] = [];
      for (const c of combat.crafts) {
        if (!c.alive || att(c.nation) === 'hold') continue;
        const reach = Math.max(0, ...c.fit.weapons.map((w) => combat.arsenal.munition(w).range));
        out.push({ pos: c.pos, reach, armed: reach > 0 && att(c.nation) === 'engage' });
      }
      for (const [id, run] of stationDef.runs) {
        const nation = NATIONS.find((n) => n.home === stationById(id)?.home);
        if (!nation || att(nation.id) === 'hold') continue;
        for (const m of run.fit) {
          const ms = run.sys.mounts[m.id];
          if (ms?.munition && ms.munition !== 'mine' && ms.hp > 0) out.push({ pos: m.pos, reach: MUNITIONS[ms.munition].range, armed: att(nation.id) === 'engage' });
        }
      }
      return out;
    };
    /** Start a jump to `id`, or say why not. `auto`: the autopilot asked, and keeps flying the leg after the drop. */
    const tryJump = (id: Dest | null, auto: boolean): boolean => {
      const body = id ? bodyOf(id) : undefined;
      const to = id ? geoRef.current.find((g) => g.id === id) : undefined;
      const hostiles = hostilesNow();
      const why = refusal({
        target: !!(id && body && to), jumping: hyper.active, docked: !!dock, inside: !!entry || air.active, lockedOn: combat.arsenal.player.threat.locked,
        hostiles, pos: posV(), toBody: body ? ship.pos.distanceTo(V(body.pos)) : 0, space: body ? spaceOf(body) : 0,
      });
      if (why) { if (!(auto && why === 'here')) flash(REFUSAL_TEXT[why]); return false; }
      // Over an armoured world the drop may come down to the plating, kept out of its set pieces point by point.
      const h = body!.id as ArmourHome;
      const sp = ARMOUR_HOMES.includes(h) ? armourLayer?.setPieces[h] : undefined;
      const centre = sp ? armourPlaces(baseGeo, SHIP_LENGTH)[h].frame.centre : null;
      const pad = Math.max(40 * SHIP_LENGTH, body!.size * 0.03); // and well clear of them: a set piece is hundreds of km across
      const blocked = sp && centre ? (p: V3) => !!setPiecePush(sp, centre, p, p, pad) : undefined;
      // To a berth: over the berth (the autopilot docks from there). Else on the side you come in on.
      const prefer: V3 | undefined = isStation(id!) ? [to!.pos[0] - body!.pos[0], to!.pos[1] - body!.pos[1], to!.pos[2] - body!.pos[2]] : undefined;
      const drop = dropPoint(body!, posV(), hostiles, SHIP_LENGTH, { prefer, others: geoRef.current, blocked });
      const path = jumpPath(posV(), drop.pos, geoRef.current);
      hyper.begin({ dest: id!, path, face: body!.pos, drop, dist: ship.pos.distanceTo(V(drop.pos)), auto }, ship);
      throttle.current = 0; boost.current = false; stopReq.current = false; stanceRef.current.mode = null; firing.current = false;
      if (!auto) autopilot.current = null;
      planRef.current = null;
      return true;
    };
    jumpRef.current = () => { tryJump(target.current ?? (pickRef.current?.kind === 'body' ? pickRef.current.id : null) ?? autopilot.current, false); };
    /**
     * A fight close by: an engaged hostile within 8,000 units. The parking orbit stands still for it, since low over a
     * world it carries the ship at tens of thousands of units a second, which no fighter can follow (scale-jump-danger D3).
     * A live raider counts at any range: the director sent it for you, and with the orbit easing out over a second the
     * ship used to be 13,000 units off before the 8,000 check saw it, so every raid fell behind and went home.
     */
    const fightNear = () => {
      const p = ship.pos;
      return combat.crafts.some((c) => c.alive && (!!c.raid || (combat.ai.modeOf(c.id) === 'engaged' && Math.hypot(c.pos[0] - p.x, c.pos[1] - p.y, c.pos[2] - p.z) < 8000)));
    };
    /** Out of the jump: over a body the leg is done (parked there); to a berth the autopilot goes on and docks. */
    const jumpArrived = (id: Dest, auto: boolean, altKm: number) => {
      orbitK = 0;
      resetAim(); // the camera comes round behind the nose, so you see the body you jumped to
      if (!isStation(id) && autopilot.current === id) {
        autopilot.current = null;
        planRef.current = null;
        const r = routeRef.current;
        if (r.engaged && routeCurrent(r) === id) { applyRoute(routeArrived(r)); setCard(id); arrivedAt = id; }
        else if (target.current === id) { target.current = null; setDest(null); }
      } else if (isStation(id) && auto) autopilot.current = id;
      flash(`Out of hyperspace · ${DEST_LABEL[id]} · ${Math.round(altKm).toLocaleString('en-US')} km up`);
    };

    const frame = (now: number) => {
      // On the fleet's tactical view time runs slow (or stops), so orders can be given in the middle of a fight.
      const dt = clamp((now - last) / 1000, 0, 0.05) * (navRef.current === 'fleet' ? fleet.tacticalScale : 1);
      // A jump runs on the wall clock (to 0.25 s a frame), so it lands inside 5 s even when frames come slowly.
      const wallDt = clamp((now - last) / 1000, 0, 0.25);
      last = now;
      const flight = flightRef.current ?? { invert: false, assist: true, look: 1, sensitivity: 1, quality: 'high' };
      if (pausedRef.current) {
        // Frozen: draw the still frame once, then wait.
        if (!pausedDrawn) { drawFrame(0); pausedDrawn = true; }
        return;
      }
      pausedDrawn = false;
      holdLeftRef();
      // Inside a sphere its display covers the view: no flight and nothing drawn until you leave.
      if (entry?.phase === 'inside' || dock?.phase === 'docked') {
        if (now - lastHud > 150) { lastHud = now; setHud((h) => (h.here || h.entering || h.speed ? { ...h, here: null, entering: null, speed: 0 } : h)); }
        return;
      }
      if (entry?.phase === 'out') {
        entry.t += dt;
        wash(Math.max(0, 1 - entry.t / 1.2));
        if (entry.t >= 1.2) entry = null;
      }
      bloom.enabled = flight.quality !== 'low';
      armourLayer?.setQuality(flight.quality === 'low' ? 'low' : 'high');
      const k = keys.current;
      let boosting = false;
      let limit = AUTO_SPEED * boostRef.current;
      // Going in is its own flight: the ordinary controls, physics and collisions wait until it is done.
      const prevPos = ship.pos.clone(); // where the ship was before this frame's move, for the armour's collision
      physics: {
      if (entry?.phase === 'in') { stepEntry(dt); phase = null; lap = null; break physics; }
      air.update(ship);
      if (dock) { stepDock(dt); phase = null; lap = null; break physics; }
      if (hyper.active) {
        const j = hyper.plan!;
        if (hyper.step(now / 1000, ship)) jumpArrived(j.dest, j.auto, j.drop.alt * KM_PER_UNIT);
        phase = null; lap = null; break physics;
      }

      // ---- Gather input from every source ----
      let yawIn = (k.has('turnLeft') ? 1 : 0) - (k.has('turnRight') ? 1 : 0);
      let pitchIn = (k.has('pitchUp') ? 1 : 0) - (k.has('pitchDown') ? 1 : 0);
      yawIn -= shape(stick.current.x);
      pitchIn -= shape(stick.current.y);
      if (k.has('forward')) throttle.current = clamp(throttle.current + dt * 0.45, 0, 1);
      if (k.has('back')) throttle.current = clamp(throttle.current - dt * 0.6, 0, 1);
      boosting = boost.current || k.has('boost') || (sprint.current && k.has('forward'));
      const thrustIn: Lateral = air.active ? { x: 0, y: 0 } : { x: (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0), y: (k.has('up') ? 1 : 0) - (k.has('down') ? 1 : 0) };
      const thrusting = thrustIn.x !== 0 || thrustIn.y !== 0;
      const pad = navigator.getGamepads?.()[0];
      if (pad) {
        yawIn -= shape(pad.axes[0] ?? 0);
        pitchIn -= shape(pad.axes[1] ?? 0);
        const up = pad.buttons[7]?.value ?? 0;
        const down = pad.buttons[6]?.value ?? 0;
        throttle.current = clamp(throttle.current + (up - down) * dt * 0.6, 0, 1);
        if (pad.buttons[5]?.pressed) boosting = true;
        const a = !!pad.buttons[0]?.pressed;
        const b = !!pad.buttons[1]?.pressed;
        if (a && !padPrev.a) engage();
        if (b && !padPrev.b) stopReq.current = true;
        padPrev.a = a; padPrev.b = b;
      }
      if (k.has('stop')) stopReq.current = true;
      yawIn = clamp(yawIn, -1, 1);
      pitchIn = clamp(pitchIn, -1, 1) * (flight.invert ? -1 : 1);
      const steering = Math.abs(yawIn) > 0.02 || Math.abs(pitchIn) > 0.02;
      // The mouse never steers (E1). The arrow keys, a gamepad or the touch joystick turn the ship; let go (with a mouse
      // and keyboard) and the ship holds the heading the turn left it on, as after a double-click.
      if (steering) aim.mode = 'stick';
      else if (aim.mode === 'stick' && !touch && !pad) { aim.mode = 'heading'; aim.dir = noseDir(); }
      const headingHeld = aim.mode === 'heading';
      const manual = steering || thrusting || k.has('forward') || k.has('back') || boosting;
      // A stance flies the ship until any thrust, the throttle, X or a stick turn takes it back (R8).
      const stc = stanceRef.current;
      let stanceGo: { dir: V3; speed: number } | null = null;
      if (stc.mode) {
        const tp = pickedPose();
        if (!tp) { stc.mode = null; flash('Target lost: stance off'); }
        else if (steering || thrusting || k.has('forward') || k.has('back') || stopReq.current || autopilot.current) { stc.mode = null; flash('Stance off'); }
        else stanceGo = stanceSteer(stc.mode, posV(), noseDir(), tp.pos, tp.vel, (stc.dist ?? defaultDist()) + tp.size, upNow());
      }
      if (stopReq.current) {
        throttle.current = 0;
        if (autopilot.current) autopilot.current = null;
        takeOver();
      }
      // Taking the controls hands the ship back to you at the speed it is already going; a route pauses.
      if (autopilot.current && manual) {
        autopilot.current = null;
        throttle.current = throttleOf(ship.speed);
        takeOver();
      } else if (manual && routeRef.current.waiting) takeOver();

      // ---- Speed limit from a surface you are on course to hit ----
      const headingNow = forwardOf(ship.yaw, ship.pitch);
      let near = Infinity;
      for (const tb of targets) {
        if (!tb.size || air.hasAir(tb.id)) continue; // a body with air: approachLimit below
        const to = tb.pos.clone().sub(ship.pos);
        const d = to.length();
        // Only a body your current line would actually hit (with a margin) slows you; flying past is fine.
        const along = to.dot(headingNow);
        if (along > 0 && to.clone().addScaledVector(headingNow, -along).length() < tb.size * 1.3 + 0.4 * COSMOS) near = Math.min(near, d - tb.size);
      }
      // The god armour too: a shell (plating plus its mounts) your line would cross from outside.
      for (const h of ARMOUR_HOMES) {
        const ap0 = armourPlaces(baseGeo, SHIP_LENGTH)[h];
        const c = V(ap0.frame.centre);
        const R = ap0.frame.rOut + ap0.skin;
        const to = c.clone().sub(ship.pos);
        const d = to.length();
        if (d < R || d > R * 1.6) continue;
        const along = to.dot(headingNow);
        const miss = to.clone().addScaledVector(headingNow, -along).length();
        if (along > 0 && miss < R) near = Math.min(near, along - Math.sqrt(R * R - miss * miss));
      }
      limit = Math.min(clamp((Number.isFinite(near) ? near : 1e9) * 0.8, 0.6, AUTO_SPEED * boostRef.current), air.approachLimit(ship.pos, headingNow));

      const ap = autopilot.current ? targets.find((t) => t.id === autopilot.current) : undefined;
      let autoDock: StationId | null = null;
      const sens = clamp(flight.sensitivity ?? 1, 0.5, 2);
      const hullTurn = fleet.hull === 'capital' ? CAPITAL_TURN : 1;
      let wantYawRate = clamp(yawIn * MAX_YAW * sens, -MAX_YAW * 1.6, MAX_YAW * 1.6) * hullTurn;
      let wantPitchRate = clamp(pitchIn * MAX_PITCH * sens, -MAX_PITCH * 1.6, MAX_PITCH * 1.6) * hullTurn;
      let want: number;
      let apAim: THREE.Vector3 | null = null;
      phase = null;
      // A long leg (the destination's body is outside the space you are in) goes by hyperspace; refused (a lock, a
      // mass lock), the autopilot flies on and tries again each second.
      if (ap && now - jumpTry > 1000) {
        jumpTry = now;
        const b = bodyOf(ap.id);
        if (b && longLeg(ship.pos.distanceTo(V(b.pos)), spaceOf(b)) && tryJump(ap.id, true)) { phase = null; lap = null; break physics; }
      }
      if (ap) {
        // The path goes around any body in the way; it is re-planned every second from where the ship is.
        const geo = geoRef.current;
        const apGeo = geo.find((x) => x.id === ap.id)!;
        if (!planRef.current || planRef.current.dest !== ap.id || now - planRef.current.at > 1000) {
          // Off the plating first if the ship is on it or under it; then round everything in the way.
          const esc = escapeVias();
          const from = esc.length ? esc[esc.length - 1] : ship.pos;
          planRef.current = { dest: ap.id, vias: [...esc, ...planPath(from.toArray() as V3, apGeo, geo).map((v) => new THREE.Vector3(...v))], at: now };
        }
        const vias = planRef.current.vias;
        // A detour point counts as passed within half a second's flight; round an armoured world, within a few percent of
        // its distance from the world's centre, so the ship turns the corner instead of cutting through the plating.
        const near0 = vias.length ? armourScale(vias[0]) : Infinity;
        while (vias.length && ship.pos.distanceTo(vias[0]) < (escaping.has(vias[0]) ? 2 * SHIP_LENGTH : Math.min(clamp(ship.speed * 0.5, ...AUTO.viaReach), near0 * 0.04))) vias.shift();
        const aim = vias[0] ?? ap.pos;
        apAim = aim;
        const d = aim.clone().sub(ship.pos);
        const dist = d.length();
        const wantYaw = Math.atan2(-d.x, -d.z);
        const wantPitch = Math.asin(clamp(d.y / Math.max(dist, 1e-6), -1, 1));
        wantYawRate = clamp(wrapPi(wantYaw - ship.yaw) * 3, -MAX_YAW, MAX_YAW);
        wantPitchRate = clamp((wantPitch - ship.pitch) * 3, -MAX_PITCH, MAX_PITCH);
        const facing = forwardOf(ship.yaw, ship.pitch).dot(d) / Math.max(dist, 1e-6);
        let along = dist;
        for (let i = 0; i < vias.length; i++) along += vias[i].distanceTo(vias[i + 1] ?? ap.pos);
        const remaining = along - ap.stop;
        let cruise = remaining > 0 ? clamp(remaining * AUTO.gain, minSpeed(parkSpeedAt(apGeo)), AUTO_SPEED) : 0;
        if (vias.length) cruise = Math.min(cruise, dist * AUTO.corner + Math.min(AUTO.cornerMin, armourScale(vias[0]) * 0.1));
        want = Math.min(limit, facing > 0.85 ? cruise : Math.min(cruise, Math.max(AUTO.creep, ship.speed * 0.4)));
        // Lifting off the plating: turn to face up in place, so the turn doesn't scrape along the plates.
        if (vias.length && escaping.has(vias[0]) && facing <= 0.85) want = 0;
        phase = facing <= 0.85 ? 'aligning' : !vias.length && want < ship.speed - 0.05 ? 'approaching' : 'cruising';
        for (const tb of targets) if (tb.size) dbg.minGap = Math.min(dbg.minGap, tb.pos.distanceTo(ship.pos) - tb.size);
        if (!vias.length && remaining < parkSlack(apGeo.stop, apGeo.park) && ship.vel.length() < parkSpeedAt(apGeo)) {
          autopilot.current = null;
          throttle.current = 0;
          planRef.current = null;
          dbg.parks.push(ap.id);
          if (isStation(ap.id) && places.get(ap.id) && ship.pos.distanceTo(V(places.get(ap.id)!.pos)) < places.get(ap.id)!.dock) autoDock = ap.id;
          const r = routeRef.current;
          if (r.engaged && routeCurrent(r) === ap.id) {
            // A stop on the route: wait here with its card until it is closed or Continue is pressed.
            applyRoute(routeArrived(r));
            setCard(ap.id);
            arrivedAt = ap.id;
            phase = 'parked';
          } else if (target.current === ap.id) { target.current = null; setDest(null); }
        }
      } else if (stanceGo) {
        // The stance points the nose along the way it wants to go, at the hull's own rates, and sets the speed.
        const turning = air.active ? { yaw: air.local.yawRate, pitch: air.local.pitchRate } : { yaw: ship.yawRate, pitch: ship.pitchRate };
        const r = aimRates(aimError(stanceGo.dir, noseDir(), upNow()), MAX_YAW * hullTurn, MAX_PITCH * hullTurn, turning);
        wantYawRate = r.yaw; wantPitchRate = r.pitch;
        yawIn = r.yaw / (MAX_YAW * sens); pitchIn = r.pitch / (MAX_PITCH * sens);
        const facing = noseDir()[0] * stanceGo.dir[0] + noseDir()[1] * stanceGo.dir[1] + noseDir()[2] * stanceGo.dir[2];
        want = Math.min(limit, facing > 0.85 ? stanceGo.speed : Math.min(stanceGo.speed, Math.max(AUTO.creep, ship.speed * 0.4)));
      } else {
        want = Math.min(limit, cruiseOf(throttle.current) * (boosting ? boostRef.current : 1));
        if (stopReq.current) want = 0;
        if (headingHeld) {
          // The nose turns to the held heading at the hull's own turn rates (a capital ship slower), and holds it.
          const turning = air.active ? { yaw: air.local.yawRate, pitch: air.local.pitchRate } : { yaw: ship.yawRate, pitch: ship.pitchRate };
          const r = aimRates(aimError(aim.dir, noseDir(), upNow()), MAX_YAW * hullTurn, MAX_PITCH * hullTurn, turning);
          wantYawRate = r.yaw; wantPitchRate = r.pitch;
          // In air the flight model takes stick fractions against its own rates: the same turn, expressed that way.
          yawIn = r.yaw / (MAX_YAW * sens); pitchIn = r.pitch / (MAX_PITCH * sens);
        // Flight assist: let go of the stick and the nose eases back toward level. (A held heading holds its own pitch.)
        } else if (flight.assist && Math.abs(pitchIn) < 0.02) wantPitchRate = -ship.pitch * 0.6;
      }
      if (stopReq.current && ship.speed < 0.05) stopReq.current = false;
      dbg.limit = limit; dbg.want = want; dbg.near = near;

      if (air.active) {
        // In an atmosphere: the flight model in air, against the local horizon (components/planet/planetAir.ts).
        air.step(dt, ship, { yawIn, pitchIn, want, assist: flight.assist && !((headingHeld || stanceGo) && !ap), sens, ap: apAim, stop: stopReq.current });
      } else {
      // Turn rates ease toward what is asked for, so the ship never snaps.
      const ease = 1 - Math.exp(-dt * 5);
      ship.yawRate += (wantYawRate - ship.yawRate) * ease;
      ship.pitchRate += (wantPitchRate - ship.pitchRate) * ease;
      ship.yaw = wrapPi(ship.yaw + ship.yawRate * dt);
      ship.pitch = clamp(ship.pitch + ship.pitchRate * dt, -1.4, 1.4);

      ship.push = want > ship.speed + 0.3 ? 1 : want < ship.speed - 0.3 ? 0 : clamp(want / Math.max(limit, 1), 0.15, 0.6);
      const rate = stopReq.current ? 4 : want < ship.speed ? 2.2 : 1.2;
      ship.speed += (want - ship.speed) * (1 - Math.exp(-dt * rate));

      const heading = forwardOf(ship.yaw, ship.pitch);
      // Assist holds momentum tightly so you go where you point; without it, turns carry a slide.
      const grip = ap ? AUTO.grip : flight.assist ? 5 : 1.6;
      ship.vel.lerp(heading.multiplyScalar(ship.speed), 1 - Math.exp(-dt * grip));
      prevPos.copy(ship.pos);
      ship.pos.addScaledVector(ship.vel, dt);
      // Side and vertical thrusters, and the dodge: on top of the motion along the nose, in the ship's own frame.
      lat = stopReq.current ? stopLateral(lat, dt) : stepLateral(lat, thrustIn, flight.assist, dt);
      if (lat.x || lat.y) {
        const ax = shipAxes(ship.yaw, ship.pitch);
        ship.pos.add(new THREE.Vector3(...ax.right).multiplyScalar(lat.x * dt)).add(new THREE.Vector3(...ax.up).multiplyScalar(lat.y * dt));
      }
      }
      if (air.active) lat = { x: 0, y: 0 }; // in air the ship flies like an aircraft: no side thrusters

      // ---- Orbit: engines off (no throttle, no boost, no autopilot) near a body, the ship circles it ----
      // Anticlockwise seen from above, and the nose turns with it, so the body stays where it was in the view.
      const fight = fightNear();
      const idle = !autopilot.current && throttle.current === 0 && !boosting && !air.active && !stanceRef.current.mode && !holdStation.current && !fight;
      const ob = orbitBody(posV(), geoRef.current, orbitId);
      orbitId = ob?.id ?? null;
      if (fight) orbitK = 0; // a fight stops the orbit at once; easing out would carry the ship away from it
      orbitK += ((idle && ob ? 1 : 0) - orbitK) * (1 - Math.exp(-dt * 0.8));
      lap = null;
      if (ob && orbitK > 0.002) {
        const rr = Math.hypot(ship.pos.x - ob.pos[0], ship.pos.y - ob.pos[1], ship.pos.z - ob.pos[2]);
        const period = orbitPeriod(ob, rr);
        const a = ((2 * Math.PI) / period) * orbitK * dt;
        ship.pos.set(...orbitStep(posV(), ob.pos, a));
        ship.vel.applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
        ship.yaw = wrapPi(ship.yaw + a);
        cam.yaw = wrapPi(cam.yaw + a);
        aim.dir = look(aim.dir, [0, 1, 0], a, 0); // the aim turns with the orbit, so the nose does not fight it
        if (orbitK > 0.5) lap = period;
      }
      dbg.orbit = { id: orbitId, k: orbitK, lap };
      // The edge is a sphere round the Sun (nav.ts LIMIT).
      const fromSun = ship.pos.clone().sub(sunAt);
      if (fromSun.length() > LIMIT) { ship.pos.copy(sunAt).add(fromSun.setLength(LIMIT)); ship.speed *= 0.5; ship.vel.multiplyScalar(0.5); }
      // Bodies are solid: stop at the surface.
      for (const tb of targets) {
        if (!tb.size || air.handles(tb.id)) continue; // in its air, the ground or the crush depth stops you
        const away = ship.pos.clone().sub(tb.pos);
        // A few ship lengths above the ground (and 0.4% of the radius, for the mesh and the bumps): low enough to skim it.
        const min = tb.size * 1.004 + 0.5;
        if (away.length() < min) { ship.pos.copy(tb.pos).addScaledVector(away.normalize(), min); ship.speed = Math.min(ship.speed, 0.5); ship.vel.multiplyScalar(0.2); dbg.hits++; }
      }
      // The god armour is solid: its plates (the grid being drawn) and its mounts. Stop at the plating, from either side.
      if (armourCollide(prevPos, flight.quality === 'low')) { ship.speed = Math.min(ship.speed, 0.5); ship.vel.multiplyScalar(0.2); dbg.armourHits++; }

      // ---- Arrivals: the body whose surface is nearest, among those you are close enough to ----
      let best: Target | null = null;
      let bestGap = Infinity;
      for (const t of targets) {
        const d = t.pos.distanceTo(ship.pos);
        if (d < t.arrive && d - t.size < bestGap) { best = t; bestGap = d - t.size; }
      }
      if (best && best.id !== arrivedAt) {
        arrivedAt = best.id;
        const r = routeRef.current;
        if (!((r.engaged || r.waiting) && routeCurrent(r) !== best.id)) setCard(best.id);
        if (target.current === best.id && !autopilot.current) { target.current = null; setDest(null); }
      } else if (!best && arrivedAt) {
        const t = targets.find((x) => x.id === arrivedAt);
        if (!t || t.pos.distanceTo(ship.pos) > t.arrive * 1.3) arrivedAt = null;
      }

      // ---- Crossing a sphere ----
      const z = arrivedAt && arrivedAt !== 'stars' && arrivedAt !== 'edge' ? destSphere(arrivedAt) : zoneOf(ship.pos.toArray() as V3);
      if (z !== zone) {
        const outward = SPHERE_ORDER.indexOf(z) > SPHERE_ORDER.indexOf(zone);
        zone = z;
        setBanner({ zone: z, outward, n: ++bannerN });
      }

      // ---- Weapons: fire while the trigger is held, then move every shot and ship ----
      const nose = shipAxes(ship.yaw, ship.pitch).fwd;
      // An empty weapon slot fires nothing; a utility slot keeps the weapon in hand on the left button.
      const slotEmpty = isWeaponSlot(slotRef.current) && !loadoutRef.current.weapons[slotRef.current];
      // ---- Locks (E6): each builds over the selected munition's lock time while its ship is within lock range ----
      const lockRangeNow = Math.max(0, ...loadoutRef.current.weapons.filter((w): w is MunitionId => !!w).map((w) => combat.arsenal.lockRange(w)));
      const lockTimeNow = combat.arsenal.lockTime(weaponRef.current);
      const lockStep = stepLocks(locksRef.current, dt, (id) => {
        const c = combat.crafts.find((x) => x.id === id && x.alive);
        return { alive: !!c, inRange: !!c && Math.hypot(c.pos[0] - ship.pos.x, c.pos[1] - ship.pos.y, c.pos[2] - ship.pos.z) <= lockRangeNow, jammed: !!c && c.jam > 0, time: lockTimeNow };
      });
      for (const id of lockStep.locked) {
        const c = combat.crafts.find((x) => x.id === id);
        if (c && combat.arsenal.onLocked(c)) { unlock(locksRef.current, id); flash(`${craftName(c)}: chaff broke the lock`); } else if (c) flash(`Locked: ${craftName(c)}`);
      }
      const act = activeLock(locksRef.current);
      const actCraft = act ? combat.crafts.find((x) => x.id === act.id && x.alive) : undefined;
      if (weaponOn.current.on && weaponOn.current.target !== null && weaponOn.current.target !== act?.id) { weaponOn.current = { on: false, target: null }; flash('Target lost: weapon off'); }
      combat.setLock(actCraft ? actCraft.id : null, actCraft ? 1 : 0, !!actCraft);
      // The guns fire at the active target's lead (E6; acceleration estimated frame to frame) while it is inside the
      // gun arc of the nose, else along the nose. With no lock, along the nose; a lock out of the arc greys the reticle.
      const wm = MUNITIONS[weaponRef.current];
      const tgt = gunTarget(dt, actCraft);
      const tracked = trackedGun(posV(), nose, tgt, wm.delivery === 'beam' ? 1e6 : wm.speed + Math.max(0, ship.speed), wm.range * combat.arsenal.scale);
      inArc = tracked.inArc;
      const gun = tracked.dir;
      const drawing = draw.current.on && isWeaponSlot(slotRef.current) && wm.lock !== 'none';
      let loose = false;
      if (draw.current.release) {
        draw.current.release = false;
        // Let go of the draw: a held lock launches guided; without one, a munition that may fly unguided does, else it is called off.
        if (combat.lock?.locked || wm.lock === 'optional') loose = true;
        else flash('No lock: the draw is let go');
      }
      const shotsBefore = combat.arsenal.stats[weaponRef.current].shots;
      const switchedOn = weaponOn.current.on && isWeaponSlot(slotRef.current) && (wm.lock !== 'required' || !!actCraft);
      combat.trigger(weaponRef.current, (firing.current || loose || switchedOn) && !navRef.current && !slotEmpty, posV(), gun, ship.speed, dt, tracked.tracking && actCraft ? actCraft.id : undefined);
      if (loose) {
        if (combat.arsenal.stats[weaponRef.current].shots > shotsBefore) combat.clearLock();
        else flash(combat.arsenal.player.block === 'ammo' ? 'Empty' : 'Reloading');
      }
      fleet.update(dt, { pos: posV(), fwd: nose, speed: ship.speed });
      // The lock and the lead follow the active target (E6), else the nose: the camera orbits freely, so the screen's
      // centre means nothing.
      const sightDir = actCraft ? new THREE.Vector3(...actCraft.pos).sub(ship.pos).normalize() : new THREE.Vector3(...nose);
      swarms.shield(dt); // hostile shield drones take the player's shots before they move
      combat.update(dt, posV(), nose, { pos: posV(), dir: sightDir.toArray() as V3 }, ship.speed, { gun, draw: drawing || undefined });
      combat.setLock(actCraft && actCraft.alive ? actCraft.id : null, actCraft ? 1 : 0, !!actCraft && actCraft.alive);
      swarms.update(dt, posV(), ship.vel.toArray() as V3);
      {
        const ex = combat.arsenal.extra;
        const ts = now / 1000;
        if (ex.landed !== feel.landed) { feel.landed = ex.landed; feel.hitAt = ts; hitTick(ts); }
        if (ex.hurt !== feel.hurt) { feel.hurt = ex.hurt; feel.hurtAt = ts; if (flight.quality !== 'low') feel.kick = FEEL.kick * SHIP_LENGTH; }
      }
      ext?.update(dt, posV(), nose, ship.vel.toArray() as V3);
      // Ship lost to enemy fire (GP-15a): the drones it had out die with it, the hooks take the rest of the price
      // (fighters out, troops aboard, credits) and name the worlds it may come back at; it stops, then comes back,
      // refitted (combat.respawn), at the nearest of those worlds' stations, or at the start when there is none.
      if (combat.arsenal.player.down) {
        if (lostT === 0) {
          let drones = 0;
          for (const r of SWARM_ROLES) {
            const s = swarms.mine[r];
            for (let i = 0; i < s.size; i++) if (s.state[i] === FLYING) { killMember(s, i); drones++; }
          }
          const me = posV();
          const homes: string[] = ext?.lost?.(me, { drones }) ?? [];
          let best = Infinity;
          respawnAt = null;
          for (const [id, pl] of places) {
            if (!isStation(id) || !homes.includes(pl.home)) continue;
            const d = Math.hypot(pl.pos[0] - me[0], pl.pos[1] - me[1], pl.pos[2] - me[2]);
            if (d < best) { best = d; respawnAt = id; }
          }
        }
        lostT += dt;
        stopReq.current = true;
        autopilot.current = null;
        if (lostT > 3) {
          // The undock pose is the station's centre: come back clear of its body (twice its size, plus a margin), out
          // along the berth's outward line. At the centre every shot began inside the station and was thrown away.
          const pose = respawnAt ? clearOf(respawnAt, undockPose(respawnAt)) : startPose;
          ship.pos.copy(pose.pos); ship.yaw = pose.yaw; ship.pitch = pose.pitch;
          ship.speed = 0; ship.vel.set(0, 0, 0); throttle.current = 0;
          cam.yaw = ship.yaw; cam.pitch = ship.pitch;
          resetAim();
          combat.respawn();
          lostT = 0;
        }
      }
      duel?.update(dt);
      stationDef.update(dt, posV(), ship.vel.toArray() as V3, !!dock);
      { const h = combat.arsenal.player.def.hull; if (Math.abs(h - hullRef.current) > 0.5) { hullRef.current = h; setHull(h); } } // one hull: arsenal's
      if (autoDock && !dock && !entry) { dockableNow = autoDock; dbg.autoDocks.push(autoDock); startDock(autoDock); }
      } // physics
      // Flown by something else (the autopilot, a stance, going in, docking, the lost state) or by a stick: the heading
      // rides on the nose, so when it hands back the ship holds the way it was going.
      if (autopilot.current || stanceRef.current.mode || entry || dock || aim.mode === 'stick' || combat.arsenal.player.down) aim.dir = noseDir();
      here = entry || dock ? null : arrivedAt ?? (lap !== null ? orbitId : null);
      if (here && isStation(here)) here = null;
      dockableNow = null;
      if (!entry && !dock) {
        for (const p of places.values()) if (ship.pos.distanceTo(V(p.pos)) < p.dock) dockableNow = (p as { id: StationId }).id;
      }

      // ---- Ship and camera ----
      ship.roll += (clamp(-ship.yawRate * 0.55, -0.75, 0.75) - ship.roll) * Math.min(1, dt * 4);
      shipObj.position.copy(ship.pos);
      shipObj.rotation.set(ship.pitch, ship.yaw, ship.roll, 'YXZ');
      // In command of a capital ship, its model is the player's (combat draws it); the cruiser hides.
      shipObj.visible = fleet.hull !== 'capital';
      if (fleet.flagship) { fleet.flagship.obj.visible = fleet.hull === 'capital'; fleet.flagship.obj.rotation.set(ship.pitch, ship.yaw, ship.roll * 0.3, 'YXZ'); }
      air.orient(shipObj);
      const t = now / 1000;
      pilotShipRef.current?.arm(weaponRef.current);
      shipModel.update(dt, ship.push * (boosting ? 1.3 : 1), t);
      boostingNow = boosting;
      const fast = clamp(Math.log10(1 + ship.speed) / Math.log10(1 + AUTO_SPEED * 0.6), 0, 1);
      const fov = 58 + fast * 16 + (boosting ? 4 : 0);
      if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
      // The camera (E2): with a mouse it orbits the ship where it was left, swung by a left-drag; holding the look-ahead
      // key (Alt) swings it back behind the nose. On a touch screen it trails the nose, as before.
      const orbiting = !touch;
      if (lookKey) {
        const lp = lookKey.startsWith('s') ? combat.crafts.find((x) => x.id === +lookKey!.slice(1) && x.alive)?.pos : geoRef.current.find((g) => g.id === lookKey!.slice(1))?.pos;
        if (!lp) lookKey = null;
        else {
          const want = poseOf(new THREE.Vector3(...lp).sub(ship.pos));
          const turn = 1 - Math.exp(-dt * 6);
          cam.yaw += wrapPi(want.yaw - cam.yaw) * turn;
          cam.pitch += (clamp(want.pitch - 0.12, -EVE.pitchLimit, EVE.pitchLimit) - cam.pitch) * turn;
        }
      }
      if (!orbiting || k.has('freelook')) {
        const turn = 1 - Math.exp(-dt * 7);
        cam.yaw += wrapPi(ship.yaw - cam.yaw) * turn;
        cam.pitch += ((orbiting ? ship.pitch + EVE.pitch0 : ship.pitch) - cam.pitch) * turn;
      }
      cam.pull += (1 + fast * 0.25 + (boosting ? 0.1 : 0) - cam.pull) * Math.min(1, dt * 3);
      const camDir = forwardOf(cam.yaw, cam.pitch);
      if (orbiting) {
        camera.position.copy(ship.pos).add(new THREE.Vector3(...orbitOffset(cam, camOffset().length() * cam.zoom)));
        camera.up.set(0, 1, 0);
        camera.lookAt(ship.pos);
      } else {
        camera.position.copy(camGoal());
        camera.lookAt(ship.pos.clone().addScaledVector(camDir, 5 * SHIP * (fleet.hull === 'capital' ? CAPITAL_CAM : 1)));
      }
      if (ship.push > 0.8 && ship.speed > 4) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * 0.01 * SHIP, (Math.random() - 0.5) * 0.01 * SHIP, 0));
      air.camera(camera, ship.pos, camOffset().multiplyScalar(cam.zoom), orbiting ? camDir.clone() : undefined);
      // F5: from the cockpit (the hull hidden, looking along the aim), or a rear view looking back past the ship.
      const camMode = entry || dock ? 0 : camModeRef.current;
      if (camMode !== 0) {
        const big = fleet.hull === 'capital' ? CAPITAL_CAM : 1;
        const ax = shipAxes(ship.yaw, ship.pitch);
        const upV = new THREE.Vector3(...(air.up ?? [0, 1, 0])); // world up in space, so the chase camera is never left tilted
        const look = new THREE.Vector3(...ax.fwd); // the cockpit looks along the nose; the rear view back past it
        if (camMode === 1) {
          camera.position.copy(ship.pos).addScaledVector(new THREE.Vector3(...ax.fwd), 0.55 * SHIP * big).addScaledVector(upV, 0.12 * SHIP * big);
          camera.up.copy(upV);
          camera.lookAt(camera.position.clone().add(look));
        } else {
          camera.position.copy(ship.pos).addScaledVector(look, 4.6 * SHIP * big * cam.pull).addScaledVector(upV, 1.25 * SHIP * big);
          camera.up.copy(upV);
          camera.lookAt(ship.pos.clone().addScaledVector(look, -5 * SHIP * big));
        }
      }
      shipObj.visible = fleet.hull !== 'capital' && camMode !== 1;
      if (fleet.flagship && camMode === 1) fleet.flagship.obj.visible = false;
      stage.classList.toggle('cam-rear', camMode === 2);
      // A hit taken: a small kick of the camera, gone in a moment (not on the low graphics setting).
      if (feel.kick > 1e-7) {
        camera.position.add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(2 * feel.kick));
        feel.kick *= Math.exp(-dt * FEEL.kickDecay);
      }
      const hurtK = Math.max(0, 1 - (t - feel.hurtAt) / FEEL.hurt);
      if (hurtRef.current) hurtRef.current.style.opacity = (hurtK * 0.55).toFixed(3);
      world?.update(dt, t, camera);
      for (const x of extras) x.update(dt, t, camera);
      gfx.update({ dt, time: t, camera, high: flight.quality !== 'low', shipVel: ship.vel, thrust: ship.push, boosting, bodies: geoRef.current, flying: !entry });
      // One sky inside the air: atmo-flight's dome; graphics' scattering shell for that body only shows from outside.
      for (const sh of world?.airShells ?? []) sh.visible = air.body !== sh.userData.airBody;

      // ---- Target marker, or an edge arrow when it is off screen ----
      const tg = target.current ? targets.find((x) => x.id === target.current) : undefined;
      const marker = markerRef.current;
      const arrow = arrowRef.current;
      let dist: number | null = null;
      if (tg && marker && arrow) {
        dist = Math.max(0, tg.pos.distanceTo(ship.pos) - tg.size);
        const w = stage.clientWidth;
        const h = stage.clientHeight;
        const p = tg.pos.clone().project(camera);
        const behind = p.z > 1;
        if (!behind && Math.abs(p.x) <= 0.92 && Math.abs(p.y) <= 0.88) {
          marker.style.display = 'block';
          arrow.style.display = 'none';
          marker.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px)`;
        } else {
          let x = behind ? -p.x : p.x;
          let y = behind ? -p.y : p.y;
          if (behind && Math.abs(x) < 1e-3 && Math.abs(y) < 1e-3) y = -1;
          const ang = Math.atan2(-y, x);
          const s = Math.min(0.86 / Math.abs(Math.cos(ang) || 1e-6), 0.78 / Math.abs(Math.sin(ang) || 1e-6));
          x = Math.cos(ang) * s;
          y = -Math.sin(ang) * s;
          arrow.style.display = 'block';
          marker.style.display = 'none';
          arrow.style.transform = `translate(${((x + 1) / 2) * w}px, ${((1 + y) / 2) * h}px) rotate(${ang}rad)`;
        }
      } else {
        if (marker) marker.style.display = 'none';
        if (arrow) arrow.style.display = 'none';
      }
      // ---- Missile lock bracket (closes in as the lock builds), and the laser's lead indicator ----
      const toScreen = (v: V3) => {
        const p = new THREE.Vector3(...v).project(camera);
        return p.z < 1 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 ? { x: ((p.x + 1) / 2) * stage.clientWidth, y: ((1 - p.y) / 2) * stage.clientHeight } : null;
      };
      // The lock bracket (E6): on the active target, else on the lock still building (closing in as it builds).
      const lm = lockMarkRef.current;
      if (lm) {
        const ls = locksRef.current;
        const l = ls.locks.find((x) => x.id === ls.active) ?? ls.locks.find((x) => !x.locked);
        const c = l ? combat.crafts.find((x) => x.id === l.id && x.alive) : undefined;
        const s = c ? toScreen(c.pos) : null;
        if (s && l) {
          lm.style.display = 'block';
          lm.style.transform = `translate(${s.x}px, ${s.y}px)`;
          lm.style.setProperty('--k', l.progress.toFixed(3));
          lm.classList.toggle('locked', l.locked);
        } else lm.style.display = 'none';
      }
      const pm = pickMarkRef.current;
      if (pm) {
        const pk = pickRef.current;
        const c = pk?.kind === 'ship' ? combat.crafts.find((x) => x.id === pk.id && x.alive) : undefined;
        const sp = c ? toScreen(c.pos) : null;
        if (sp && c) { pm.style.display = 'block'; pm.style.transform = `translate(${sp.x}px, ${sp.y}px)`; pm.classList.toggle('hostile', c.hostile); } else pm.style.display = 'none';
      }
      const am = combat.aim;
      const ld = leadMarkRef.current;
      const bs = boreMarkRef.current;
      const dl = MUNITIONS[weaponRef.current].delivery;
      const lead = am && (dl === 'bolt' || dl === 'burst' || dl === 'beam') ? toScreen(am.lead) : null;
      const bore = am && lead ? toScreen(am.bore) : null;
      if (ld) {
        if (lead && am) {
          ld.style.display = 'block';
          ld.style.transform = `translate(${lead.x}px, ${lead.y}px)`;
          ld.classList.toggle('hit', am.willHit);
        } else ld.style.display = 'none';
      }
      if (bs) {
        if (bore && am) {
          bs.style.display = 'block';
          bs.style.transform = `translate(${bore.x}px, ${bore.y}px)`;
          bs.classList.toggle('hit', am.willHit);
        } else bs.style.display = 'none';
      }
      // The reticle is where the nose points (the guns fire along it), not the screen's centre: the camera orbits freely.
      if (noseMarkRef.current) noseMarkRef.current.style.display = 'none';
      const rt = reticleRef.current;
      if (rt) {
        const s = !entry && !dock ? toScreen(add(posV(), scale(noseDir(), 400 * SHIP))) : null;
        rt.style.visibility = s ? '' : 'hidden';
        if (s) rt.style.transform = `translate(${(s.x - stage.clientWidth / 2).toFixed(1)}px, ${(s.y - stage.clientHeight / 2).toFixed(1)}px)`;
        rt.classList.toggle('out', !inArc && !entry && !dock);
        rt.classList.toggle('guard', combat.arsenal.player.guard);
        rt.classList.toggle('hitmark', now / 1000 - feel.hitAt < FEEL.hitmark);
        const dr = draw.current.on && isWeaponSlot(slotRef.current) && MUNITIONS[weaponRef.current].lock !== 'none';
        rt.classList.toggle('draw', dr);
        rt.style.setProperty('--k', dr && combat.lock ? combat.lock.progress.toFixed(3) : '0');
      }
      // The held heading while the nose is still turning to it (E3), and the double-click's marker, fading.
      const ad = aimRef.current;
      if (ad) {
        const turningTo = aim.mode === 'heading' && !entry && !dock && angleBetween(aim.dir, noseDir()) > EVE.onHeading;
        const s = turningTo ? toScreen(add(posV(), scale(aim.dir, 400 * SHIP))) : null;
        if (s) { ad.style.display = 'block'; ad.style.transform = `translate(${s.x}px, ${s.y}px)`; } else ad.style.display = 'none';
      }
      const fm = flyMarkRef.current;
      if (fm) {
        const age = t - flyMark.at;
        const s = flyMark.dir && age < EVE.markLife ? toScreen(add(posV(), scale(flyMark.dir, 400 * SHIP))) : null;
        if (s) { fm.style.display = 'block'; fm.style.transform = `translate(${s.x}px, ${s.y}px)`; fm.style.opacity = (1 - age / EVE.markLife).toFixed(3); } else fm.style.display = 'none';
      }
      if (throttleFillRef.current) throttleFillRef.current.style.height = `${(autopilot.current ? throttleOf(ship.speed) : throttle.current) * 100}%`;

      air.render(camera, shipObj, ship, flight.quality === 'low' ? 'low' : 'high', heatRef.current);
      hyper.draw(wallDt, camera);
      if (frames.on) drawFrame(dt); // the dev hook can fly without drawing, for long headless checks
      if (now - lastLegs > 500) { lastLegs = now; legs = computeLegs(); }
      if (now - lastMini > 100) {
        lastMini = now;
        const c = miniRef.current;
        if (c && c.clientWidth) {
          const { ctx, w, h } = fitCanvas(c, 2);
          // Real scale: the whole system is too wide for the corner, so the minimap follows the ship, zoomed in.
          const sn = snapshot(false);
          const [mx, my] = mapXY(sn.pos);
          drawNavMap(ctx, w, h, { zoom: 2.5, panX: mx, panY: my }, sn, { full: false, time: now / 1000 });
        }
      }
      if (now - lastHud > 150) {
        lastHud = now;
        setDockable((d) => (d === dockableNow ? d : dockableNow));
        const rr = routeRef.current;
        setHud({
          phase: rr.waiting ? 'parked' : phase,
          jump: hyper.state ? `Hyperspace · ${DEST_LABEL[hyper.state.dest]} · ${hyper.state.phase === 'spool' ? 'spooling' : hyper.state.phase === 'travel' ? 'jumping' : 'dropping out'} · ${hyper.state.left.toFixed(1)} s` : null,
          leg: legs.length ? legs[0].eta : null,
          orbit: lap !== null ? orbitId : null,
          lap,
          total: legs.length ? legs.reduce((a, l) => a + l.eta, 0) : null,
          speed: ship.speed,
          zone,
          throttle: autopilot.current ? throttleOf(ship.speed) : throttle.current,
          limited: !autopilot.current && limit < cruiseOf(throttle.current) * (boosting ? boostRef.current : 1) - 0.5,
          dist,
          auto: !!autopilot.current,
          here,
          entering: entry?.phase === 'in' ? entry.id : null,
          lock: combat.lock ? { name: combat.lock.craft.drill?.label ?? NATIONS.find((n) => n.id === combat.lock!.craft.nation)!.name, progress: combat.lock.progress, locked: combat.lock.locked } : null,
          aim: combat.aim ? { name: combat.aim.craft.drill?.label ?? NATIONS.find((n) => n.id === combat.aim!.craft.nation)!.name, willHit: combat.aim.willHit } : null,
          kills: combat.stats.kills,
          arms: combat.arsenal.hud(weaponRef.current),
          drones: rackLine(swarms.rack),
          bar: barSlots(),
          stance: stanceRef.current.mode ? `${STANCE_LABEL[stanceRef.current.mode]} · ${fmtDist(stanceRef.current.dist ?? defaultDist())}` : stanceRef.current.rAt !== null && stanceRef.current.scrolled ? `Distance · ${fmtDist(stanceRef.current.dist ?? defaultDist())}` : null,
          pick: (() => { const p = pickedPose(); return p ? `${p.name} · ${fmtDist(Math.max(0, Math.hypot(p.pos[0] - ship.pos.x, p.pos[1] - ship.pos.y, p.pos[2] - ship.pos.z) - (pickRef.current?.kind === 'body' ? p.size : 0)))}` : null; })(),
          ov: overviewRef.current || (flight.ovPinned ?? true) ? overviewRows() : [],
          sel: selInfo(),
          locks: locksRef.current.locks.map((l) => {
            const c = combat.crafts.find((x) => x.id === l.id);
            return { id: l.id, name: c ? craftName(c) : '?', progress: l.progress, locked: l.locked, active: locksRef.current.active === l.id, dist: c ? fmtDist(selDist(c.pos, 0)) : '' };
          }),
          air: air.hud(ship),
          airEvent: air.event,
          useOn: !!useTarget(),
          cardDist: (() => { const c = cardRef.current ? targets.find((x) => x.id === cardRef.current) : undefined; return c ? Math.max(0, c.pos.distanceTo(ship.pos) - c.size) : null; })(),
        });
      }
    };
    renderer.setAnimationLoop(frame);
    rendererRef.current = { renderer, composer, bloom };
    apiRef.current = {
      getState: () => {
        // Inside (or going in), the saved place is where the ship went in, so a restored journey can leave from there.
        const inn = entry && entry.phase !== 'out' ? entry : null;
        // Docked (or docking), it is the place outside the station's mouth, where undocking puts the ship.
        const pose = dock ? undockPose(dock.id) : inn ? inn.pose : ship;
        return { pos: pose.pos.toArray() as [number, number, number], scale: COSMOS, yaw: pose.yaw, pitch: pose.pitch, target: target.current, route: { ...routeRef.current }, inside: inn ? inn.id : null, docked: dock ? dock.id : null, hull: hullRef.current };
      },
      setState: (st) => {
        air.leaveQuietly(ship);
        entry = null;
        dock = null;
        setDocked(null);
        insideRef.current = null;
        setInside(null);
        wash(0);
        ship.pos.fromArray(migratePos(st.pos, st.scale)); // saves from before a rescale: 1/185 the size, or 1/5 (200 m ships)
        ship.yaw = st.yaw;
        ship.pitch = st.pitch;
        ship.speed = 0;
        ship.vel.set(0, 0, 0);
        ship.yawRate = 0;
        ship.pitchRate = 0;
        throttle.current = 0;
        autopilot.current = null;
        target.current = (st.target as Dest) ?? null;
        setDest((st.target as Dest) ?? null);
        cam.yaw = ship.yaw;
        cam.pitch = ship.pitch;
        resetAim();
        camera.position.copy(camGoal());
        pausedDrawn = false;
        planRef.current = null;
        const r = routeFromSave(st.route);
        applyRoute(r);
        setCard(r.waiting ? routeCurrent(r) : null);
        if (isDest(st.inside)) goInside(st.inside, { pos: ship.pos.clone(), yaw: ship.yaw, pitch: ship.pitch });
        if (isStation(st.docked)) goDocked(st.docked);
        setHullBoth(typeof st.hull === 'number' ? st.hull : PLAYER_HULL);
      },
      openNav: (tab) => setNav(tab),
      probe: () => ({
        throttle: autopilot.current ? throttleOf(ship.speed) : throttle.current,
        speed: ship.speed,
        boosting: boostingNow,
        yaw: ship.yaw,
        pitch: ship.pitch,
        // The tutorial speaks of a laser and a missile: every guided munition is its missile, every gun its laser.
        ...(() => {
          const kind = (m: MunitionId) => (MUNITIONS[m].delivery === 'missile' ? 'missile' as const : 'laser' as const);
          const sum = (k: 'laser' | 'missile', f: 'shots' | 'hits') => (Object.entries(combat.arsenal.stats) as [MunitionId, MunitionStats][])
            .reduce((a, [id, s]) => a + (kind(id) === k ? s[f] : 0), 0);
          return {
            weapon: kind(weaponRef.current),
            weapons: [...new Set(loadoutRef.current.weapons.map(kind))],
            laserShots: sum('laser', 'shots'), laserHits: sum('laser', 'hits'),
            missileShots: sum('missile', 'shots'), missileHits: sum('missile', 'hits'),
          };
        })(),
        aimHit: !!combat.aim?.willHit,
        locked: !!combat.lock?.locked,
        nav: navRef.current === 'fleet' ? null : navRef.current,
        auto: !!autopilot.current,
        target: target.current,
        docked: dock?.phase === 'docked' ? dock.id : null,
        hull: hullRef.current,
        maxHull: PLAYER_HULL,
        drillLeft: combat.drillLeft().length,
        dronesOut: swarms.rack.reduce((n, r) => n + r.flying, 0),
        drillAhead: (() => {
          const f = shipAxes(ship.yaw, ship.pitch).fwd;
          return combat.drillLeft().some((c) => {
            const d = new THREE.Vector3(...c.pos).sub(ship.pos);
            return d.dot(new THREE.Vector3(...f)) > 0; // they keep station, so only turning away loses them
          });
        })(),
      }),
      setTarget: (d) => { if (autopilot.current && autopilot.current !== d) autopilot.current = null; target.current = d; setDest(d); },
      flyTo: (d) => actionsRef.current.fly(d),
      setHull: (v) => setHullBoth(v),
      holdStation: (on) => { holdStation.current = on; },
      drill: (n) => {
        if (n <= 0) { combat.clearDrill(); return 0; }
        // They keep station off the bow as the ship was pointing: the ship can drift (an idle ship falls into orbit)
        // without leaving them behind, and turning away and back finds them where they were.
        const fwd = shipAxes(ship.yaw, ship.pitch).fwd;
        const off = new THREE.Vector3(...fwd).multiplyScalar(DRILL_RANGE);
        combat.addDrill(() => ship.pos.clone().add(off).toArray() as V3, fwd, n, PLAYER_NATION);
        return combat.drillLeft().length;
      },
    };
    if (import.meta.env.DEV) {
      // Test hook: advance the flight by hand when the browser isn't drawing frames.
      (window as unknown as { __voyage?: unknown }).__voyage = {
        /** Real scale's measuring stick: game systems' ms a frame (drawing off), then one draw's calls and triangles. */
        perf: (n = 60) => {
          const was = frames.on;
          frames.on = false;
          let t = last;
          const t0 = performance.now();
          for (let i = 0; i < n; i++) { t += 1000 / 30; frame(t); }
          const ms = (performance.now() - t0) / n;
          frames.on = was;
          last = performance.now();
          renderer.info.autoReset = false;
          renderer.info.reset();
          const d0 = performance.now();
          drawFrame(0);
          const drawMs = performance.now() - d0;
          const out = { systemsMs: +ms.toFixed(2), drawMs: +drawMs.toFixed(1), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
          renderer.info.autoReset = true;
          return out;
        },
        run: (seconds: number) => { let t = last; for (let i = 0; i < seconds * 30; i++) { t += 1000 / 30; frame(t); } last = performance.now(); return { pos: ship.pos.toArray().map((v) => +v.toFixed(1)), speed: ship.speed, zone }; },
        ship, scene, bloom, composer, camera, renderer, dbg,
        get entry() { return entry; }, get here() { return here; }, enter: (id?: Dest) => startEntry(id ?? here), leave,
        input: { keys: keys.current, stick: stick.current, throttle, boost, stopReq, autopilot, target },
        route: routeRef, plan: planRef, snap: () => snapshot(true),
        get actions() { return actionsRef.current; },
        combat, firing, setWeapon, get weapon() { return weaponRef.current; }, selectSlot, get slot() { return slotRef.current; }, get swarmRole() { return swarmRole.current; }, ext, arsenal: combat.arsenal,
        setLoadout: (l: unknown) => { const x = sanitizeLoadout(l); loadoutRef.current = x; combat.arsenal.setLoadout(x); pilotShip?.refit(x); boostRef.current = fitted(x).boost; if (!x.weapons.includes(weaponRef.current)) setWeapon(x.weapons[0]); return x; },
        countermeasure: () => combat.arsenal.countermeasure(posV(), shipAxes(ship.yaw, ship.pitch).fwd, ship.speed),
        fleet, takeCommand: (force = true) => fleet.takeCommand({ pos: posV(), fwd: shipAxes(ship.yaw, ship.pitch).fwd }, force),
        render: () => { drawFrame(0); return renderer.domElement.toDataURL('image/jpeg', 0.8); },
        duel,
        swarms, geo: () => geoRef.current,
        get world() { return world; }, get dock() { return dock; }, get dockable() { return dockableNow; }, startDock, undock, hull: hullRef, setHull: setHullBoth, stations: stationDef,
        air, hyper, tryJump, hostilesNow,
        gfx, fx: FX,
        get armour() { return armourLayer; }, places, cam, armourCollide, entryVias, draw: frames,
        pick: pickRef, stance: stanceRef, pickUnder, pickedPose, overviewRows, get overview() { return overviewRef.current; },
        get camMode() { return camModeRef.current; }, get hudOff() { return hudOffRef.current; },
        get lat() { return lat; }, dodge, weaponDraw: draw.current, click: clickRef.current, useTarget, get inArc() { return inArc; },
        // EVE controls (eve-controls): the held heading, the orbit camera, a double-click at a screen point, a left-drag.
        eve: {
          aim, cam, flyMark, flyTo: (x: number, y: number) => flyTo(x, y), drag: (dx: number, dy: number) => dragCam(dx, dy), zoom: (dir: number) => zoomCam(dir),
          error: () => aimError(aim.dir, noseDir(), upNow()), get turn() { return { yaw: ship.yawRate, pitch: ship.pitchRate }; },
          get press() { return press; }, get lastClick() { return lastClick; },
          locks: locksRef.current, weaponOn, lockShip, activate: activateWeapon, selAct: (a: SelAction, key?: string) => selActRef.current(a, key), selInfo, pickRay, get lookKey() { return lookKey; },
        },
      };
    }

    // ---- Pointer: the mouse (E1-E3) drags the camera, double-clicks to fly and keeps its buttons' actions; it never
    // turns the ship. Touch keeps the floating joystick (left side) and tap to pick a target ----
    const ray = new THREE.Raycaster();
    const el = renderer.domElement;
    let drag: { id: number; x: number; y: number; moved: boolean; joy: boolean } | null = null;
    const JOY_R = 56;
    const showJoy = (x: number, y: number, kx: number, ky: number) => {
      const b = joyBaseRef.current;
      const n = joyKnobRef.current;
      if (!b || !n) return;
      b.style.display = 'block';
      b.style.transform = `translate(${x}px, ${y}px)`;
      n.style.transform = `translate(${kx}px, ${ky}px)`;
    };
    const hideJoy = () => { if (joyBaseRef.current) joyBaseRef.current.style.display = 'none'; };
    const local = (e: PointerEvent) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }; };
    /** A screen point (client pixels) as a world direction from the camera. */
    const screenDir = (cx: number, cy: number): V3 => {
      const rect = el.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1), camera);
      return ray.ray.direction.toArray() as V3;
    };
    /**
     * Double-click in space (E3): the ship turns to that direction at its own rates and holds it. From a stop the engines
     * open; moving, the throttle stays. A stance or the autopilot is called off.
     */
    const flyTo = (cx: number, cy: number) => {
      if (entry || dock || combat.arsenal.player.down) return;
      const dir = screenDir(cx, cy);
      aim.dir = dir; aim.mode = 'heading';
      if (stanceRef.current.mode) stanceRef.current.mode = null;
      if (autopilot.current) { autopilot.current = null; throttle.current = throttleOf(ship.speed); }
      takeOver();
      throttle.current = flyCommand(throttle.current);
      flyMark.dir = dir; flyMark.at = performance.now() / 1000;
    };
    /** Left-drag (E2): the camera swings round the ship. The mouse's sensitivity setting is the camera's now. */
    const dragCam = (dx: number, dy: number) => {
      const f = flightRef.current;
      const o = orbitDrag(cam, dx, dy, clamp(f?.look ?? 1, 0.1, 2), !!f?.invert);
      cam.yaw = o.yaw; cam.pitch = o.pitch;
    };
    const zoomCam = (dir: number) => { cam.zoom = zoomStep(cam.zoom, dir); };
    // The left button: a drag swings the camera, a double-click flies, and (until E6) a press held still fires whatever is
    // on it. The other buttons keep their actions (right: shield, draw, deploy, dock; middle: pick). Mouse buttons arrive
    // as mousedown and mouseup, one for each button, so left and right can be held together.
    let press: { x: number; y: number; t: number; drag: boolean; act: Action | null; acting: boolean } | null = null;
    let lastClick: Click | null = null;
    let rightHeld = false;
    /** What a click at a client point lands on (E4). */
    const pickAt = (cx: number, cy: number) => pickRay(camera.position.toArray() as V3, screenDir(cx, cy));
    const onMouseDown = (e: MouseEvent) => {
      if (pausedRef.current) return;
      e.preventDefault(); // no middle-click scrolling, no text selection while dragging
      setMenu(null);
      const act = actionFor(binds(), mouseCode(e.button));
      if (e.button === 0) { press = { x: e.clientX, y: e.clientY, t: performance.now() / 1000, drag: false, act, acting: false }; return; }
      if (e.button === 2) {
        rightHeld = true;
        // Right click on a ship, station or body: EVE's menu (E5). On empty space: the slot's own right click.
        const pk = navRef.current ? null : pickAt(e.clientX, e.clientY);
        const info = pk ? selInfo(keyOf(pk)) : null;
        if (info) {
          const r = stage.getBoundingClientRect();
          setMenu({ x: Math.min(e.clientX - r.left, r.width - 190), y: Math.min(e.clientY - r.top, r.height - 280), sel: info });
          return;
        }
      }
      if (e.button === 1 && act === 'pick') { pickUnder(screenDir(e.clientX, e.clientY)); return; } // middle click: select what is under it
      if (!act) return;
      if (CLICKS.has(act)) clickRef.current.down(act);
      else if (HELD.has(act)) keys.current.add(act);
      else kd(new KeyboardEvent('keydown', { code: mouseCode(e.button) })); // any other action put on a mouse button
    };
    // E4 replaced E1-E3's "hold the left button still to fire": the left button selects, and fires only on the active
    // target (E6). The fire action stays for a key put on it, and the touch Fire button.
    holdLeftRef = () => {};
    let ctrlClicked = false; // a Ctrl+click locked something: Ctrl's boost waits for Ctrl to be let go
    const onMouseMoveWin = (e: MouseEvent) => {
      if (!press) return;
      if (!press.drag && Math.hypot(e.clientX - press.x, e.clientY - press.y) > EVE.slop) {
        press.drag = true;
        stage.classList.add('cam-drag');
        if (press.acting && press.act) { if (CLICKS.has(press.act)) clickRef.current.up(press.act); else keys.current.delete(press.act); press.acting = false; }
      }
      if (press.drag && !pausedRef.current && !navRef.current) dragCam(e.movementX || 0, e.movementY || 0);
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        const p = press;
        press = null;
        stage.classList.remove('cam-drag');
        if (!p) return;
        if (p.acting && p.act) { if (CLICKS.has(p.act)) clickRef.current.up(p.act); else keys.current.delete(p.act); return; }
        if (p.drag || pausedRef.current || navRef.current) return;
        // A click on a ship, station or body (E4): Ctrl+click locks a ship (E6); a click on the active locked target
        // fires the selected weapon at it; any other click selects it.
        const pk = pickAt(e.clientX, e.clientY);
        if (pk) {
          lastClick = null;
          if (e.ctrlKey && pk.kind === 'ship') { lockShip(pk.id); ctrlClicked = true; keys.current.delete('boost'); return; }
          if (pk.kind === 'ship' && locksRef.current.active === pk.id) { selectKey(keyOf(pk)); activateWeapon(false); return; }
          selectKey(keyOf(pk));
          return;
        }
        // A click in empty space: the second of a pair flies there (E3).
        const t = performance.now() / 1000;
        if (isDoubleClick(lastClick, t, e.clientX, e.clientY)) { lastClick = null; flyTo(e.clientX, e.clientY); return; }
        lastClick = { t, x: e.clientX, y: e.clientY };
        return;
      }
      if (e.button === 2) rightHeld = false;
      const act = actionFor(binds(), mouseCode(e.button));
      if (!act) return;
      if (CLICKS.has(act)) clickRef.current.up(act);
      else keys.current.delete(act);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return; // the mouse: onMouseDown
      if (drag) return;
      const p = local(e);
      const joy = p.x < p.w * 0.55;
      drag = { id: e.pointerId, x: p.x, y: p.y, moved: false, joy };
      el.setPointerCapture(e.pointerId);
      if (joy) showJoy(p.x, p.y, 0, 0);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || !drag || e.pointerId !== drag.id) return;
      const p = local(e);
      let dx = p.x - drag.x;
      let dy = p.y - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 6) drag.moved = true;
      if (!drag.moved) return;
      const R = drag.joy ? JOY_R : 140;
      const len = Math.hypot(dx, dy);
      if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
      stick.current.x = dx / R;
      stick.current.y = dy / R;
      if (drag.joy) showJoy(drag.x, drag.y, dx, dy);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      if (!drag || e.pointerId !== drag.id) return;
      const wasTap = !drag.moved;
      drag = null;
      stick.current.x = 0;
      stick.current.y = 0;
      hideJoy();
      if (!wasTap || !world) return;
      const rect = el.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera);
      const hit = ray.intersectObjects(world.pickables, false)[0];
      if (hit) choose(hit.object.userData.dest);
    };
    const noMenu = (e: MouseEvent) => e.preventDefault(); // the right button is the game's (R6), not the browser's menu
    // The wheel cycles the hotbar (R4); with the right button held it zooms the camera (E2); W and S are the throttle.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (pausedRef.current || navRef.current) return;
      if (rightHeld) { zoomCam(e.deltaY); return; }
      const st = stanceRef.current;
      if (st.rAt !== null) { // hold R and scroll: the stance's distance
        st.scrolled = true;
        st.dist = scrollDistance(st.dist ?? defaultDist(), e.deltaY, 0.5, 170 * COSMOS);
        setHud((h) => ({ ...h, stance: `${st.mode ? STANCE_LABEL[st.mode] : 'Distance'} · ${fmtDist(st.dist!)}` }));
        return;
      }
      selectSlot(scrollSlot(slotRef.current, e.deltaY));
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('mousedown', onMouseDown);
    addEventListener('mouseup', onMouseUp);
    addEventListener('mousemove', onMouseMoveWin);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('contextmenu', noMenu);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    // ---- Keyboard ----
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
    const kd = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const key = e.key.toLowerCase();
      if (key === 'escape') {
        e.preventDefault();
        if (menuOpen.current) { setMenu(null); return; }
        keys.current.clear(); stick.current.x = 0; stick.current.y = 0;
        if (cmdModeRef.current) setCmdMode(false); else if (navRef.current) setNav(null); else if (entry && entry.phase !== 'out') leave(); else if (dock?.phase === 'docked' && !pausedRef.current) undock(); else onMenuRef.current();
        return;
      }
      const act = actionFor(binds(), codeOf(e));
      // Fleet command mode takes the next keys (its own letters and the wing digits) while it is open.
      if (fleet.flagship && cmdModeRef.current && act !== 'command' && !e.ctrlKey && !e.metaKey && !e.altKey && !navRef.current && !pausedRef.current) {
        const r = commandKey(fleet, key, combat.lock?.craft.id ?? pickedShip());
        if (r) { e.preventDefault(); if (r === 'path') setNav('fleet'); if (r !== 'stay') setCmdMode(false); return; }
      }
      if (!act) return;
      e.preventDefault(); // a bound key is the game's: no browser menu bar, find bar, reload or help (Ctrl+W still closes the tab)
      if (act === 'freelook') { keys.current.add('freelook'); return; }
      if (act === 'overview') { if (!e.repeat && !pausedRef.current && !navRef.current) { keys.current.clear(); letGo(); setOverview(true); setHud((h) => ({ ...h, ov: overviewRows() })); } return; }
      if (e.repeat && !HELD.has(act)) return;
      if (act === 'fullscreen') { onFullRef.current?.(); return; }
      if (act === 'nav') { setNav((t) => (t ? null : 'map')); return; }
      if (navRef.current || pausedRef.current) return; // flight keys wait while a menu or the navigation screen is open
      if (act === 'command') { if (fleet.flagship) { keys.current.clear(); setCmdMode(!cmdModeRef.current); } else flash('Fleet command needs a capital ship'); return; }
      if (act === 'fleetAttack') { if (fleet.flagship) fleet.orders.ping(combat.lock?.craft.id ?? pickedShip()); return; }
      if (act === 'loadout') { onLoadoutRef.current?.(); return; }
      if (entry && entry.phase !== 'out') return; // and while going in, or inside
      if (dock) return; // and while docking, or docked
      if (act === 'boost' && ctrlClicked) return; // Ctrl was for a Ctrl+click lock, not a boost
      if (HELD.has(act)) {
        if (!e.repeat) pressed(act);
        keys.current.add(act);
        return;
      }
      if (CLICKS.has(act)) { clickRef.current.down(act); return; }
      switch (act) {
        case 'enter':
          if (routeRef.current.waiting) actionsRef.current.continueRoute();
          else if (here) startEntry(here);
          else if (dockableNow) startDock();
          return;
        case 'autopilot':
          // A picked ship: fly to it (the approach stance). Otherwise the autopilot to the destination.
          if (pickRef.current?.kind === 'ship') { stanceRef.current.mode = 'approach'; flash(`Approach: ${pickedPose()?.name ?? ''}`); return; }
          stanceRef.current.mode = null; engage(); return;
        case 'hyperspace': jumpRef.current?.(); return;
        case 'stance': stanceDown(); return;
        case 'hud': {
          hudOffRef.current = !hudOffRef.current;
          stage.parentElement?.classList.toggle('hud-off', hudOffRef.current);
          stage.classList.toggle('hud-off', hudOffRef.current);
          return;
        }
        case 'zoomIn': zoomCam(-1); return;
        case 'zoomOut': zoomCam(1); return;
        case 'camera': camModeRef.current = ((camModeRef.current + 1) % 3) as 0 | 1 | 2; flash(CAM_LABEL[camModeRef.current]); return;
        case 'counter': countermeasureRef.current(); return;
        case 'board': ext?.key('t'); return; // boarding's own command letter (components/boarding.ts)
        case 'slot1': case 'slot2': case 'slot3': case 'slot4': case 'slot5': case 'slot6': case 'slot7': case 'slot8': case 'slot9':
          // The weapon in hand's number again: switch it on at the active target, or off (E6, EVE's module button).
          if (+act.slice(4) - 1 === slotRef.current && isWeaponSlot(slotRef.current)) { activateWeapon(); return; }
          selectSlot(+act.slice(4) - 1); return;
        case 'swap': selectSlot(swapTarget(slotRef.current, slotMem.current)); return;
        case 'lock': {
          // The lock key (E6): the selected ship, else the ship along the nose.
          const pk = pickRef.current?.kind === 'ship' ? pickRef.current : pickRay(posV(), noseDir());
          if (pk?.kind === 'ship') lockShip(pk.id); else flash('Select a hostile ship to lock');
          return;
        }
        default: return;
      }
    };
    /** The first press of a held action: double-taps (dodge, sprint). */
    const pressed = (act: Action) => {
      const t = performance.now() / 1000;
      if (act === 'forward') { if (doubleTap(taps, act, t)) sprint.current = true; return; }
      if ((act === 'left' || act === 'right') && doubleTap(taps, act, t)) {
        if (air.active) { flash('No dodge in air'); return; }
        const r = tryDodge(dodge, lat, act === 'left' ? -1 : 1, t, combat.arsenal.player.energy);
        if (r.ok) combat.arsenal.player.energy -= r.cost;
        else flash(r.why === 'cooldown' ? `Dodge in ${(dodge.readyAt - t).toFixed(1)} s` : 'Dodge: not enough energy');
      }
    };
    const ku = (e: KeyboardEvent) => {
      const act = actionFor(binds(), codeOf(e));
      if (act && CLICKS.has(act)) clickRef.current.up(act);
      if (act === 'stance') stanceUp();
      if (act === 'overview' && overviewRef.current) setOverview(false);
      if (act) keys.current.delete(act);
      if (act === 'forward') sprint.current = false;
      if (act === 'boost') ctrlClicked = false;
    };
    const blur = () => { keys.current.clear(); letGo(); if (overviewRef.current) setOverview(false); stanceRef.current.rAt = null; press = null; rightHeld = false; stage.classList.remove('cam-drag'); };
    addEventListener('keydown', kd);
    addEventListener('keyup', ku);
    addEventListener('blur', blur);

    const ro = new ResizeObserver(() => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bloom.resolution.set(w / 2, h / 2);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(host);

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      removeEventListener('keydown', kd);
      removeEventListener('keyup', ku);
      removeEventListener('blur', blur);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('mousedown', onMouseDown);
      removeEventListener('mouseup', onMouseUp);
      removeEventListener('mousemove', onMouseMoveWin);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('contextmenu', noMenu);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      world?.dispose();
      fleet.dispose();
      fleetRef.current = null;
      ext?.dispose();
      swarms.dispose();
      stationDef.dispose();
      hyper.dispose();
      air.dispose();
      combat.dispose();
      duel?.dispose();
      combatRef.current = null;
      gfx.dispose();
      composer.dispose();
      envTex.dispose();
      pmrem.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      renderer.dispose();
      el.remove();
      worldRef.current = null;
      rendererRef.current = null;
      apiRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Graphics quality: resolution follows the setting (bloom is switched per frame).
  const quality = data.settings.flight?.quality ?? 'high';
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const pr = quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    r.renderer.setPixelRatio(pr);
    r.composer.setPixelRatio(pr);
  }, [quality]);

  // A new loadout from the pause menu: refit (shield, capacitor, ammunition and drones refilled), and keep a fitted weapon selected.
  useEffect(() => {
    const l = loadoutRef.current;
    combatRef.current?.arsenal.setLoadout(l);
    pilotShipRef.current?.refit(l); // the hull shows what is fitted
    boostRef.current = fitted(l).boost;
    if (!l.weapons.includes(weaponRef.current)) setWeapon(l.weapons[0]);
    if (isWeaponSlot(slotRef.current) && l.weapons[slotRef.current]) setWeapon(l.weapons[slotRef.current]);
  }, [loadoutKey]);

  // Releasing the stick when the menu opens, so the ship does not keep turning underneath it.
  useEffect(() => { if (paused) { stick.current.x = 0; stick.current.y = 0; keys.current.clear(); letGo(); } }, [paused]);
  // The navigation screen covers the view: let go of the stick so the ship does not keep turning under it.
  useEffect(() => {
    if (!nav) return;
    stick.current.x = 0; stick.current.y = 0; keys.current.clear(); letGo();
    if (aimRef.current) aimRef.current.style.display = 'none';
  }, [nav]);

  // The short line under the crosshair fades.
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote((x) => (x && x.n === note.n ? null : x)), 1400);
    return () => clearTimeout(t);
  }, [note]);

  // Banner fades after a few seconds.
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner((b) => (b && b.n === banner.n ? null : b)), 3800);
    return () => clearTimeout(t);
  }, [banner]);

  // Throttle slider: drag anywhere on the track.
  const setThrottleFrom = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    throttle.current = clamp(1 - (e.clientY - r.top) / r.height, 0, 1);
    if (throttle.current < 0.03) throttle.current = 0;
    autopilot.current = null;
    takeOver();
  };

  const onRoute = route.engaged && !route.waiting;
  const status = hud.jump ? hud.jump : docked ? `Docked · ${DEST_LABEL[docked]}` : hud.entering ? `Entering ${DEST_LABEL[hud.entering]}` : hud.auto
    ? `${onRoute ? 'Route' : 'Autopilot'} · ${DEST_LABEL[dest ?? 'earth']}${hud.phase ? ` · ${PHASE_LABEL[hud.phase]}` : ''}`
    : route.waiting ? `Parked · ${DEST_LABEL[routeCurrent(route) ?? 'earth']}`
      : hud.orbit ? `Orbiting ${DEST_LABEL[hud.orbit]} · lap ${fmtEta(hud.lap)}`
        : hud.limited ? 'Slowing near a surface' : hud.throttle === 0 ? 'Engines idle' : `Throttle ${Math.round(hud.throttle * 100)}%`;
  const cur = routeCurrent(route);
  const next = route.stops[route.index + 1];
  const done = routeDone(route);
  const continueCard = route.waiting && card === cur ? { label: next ? `Continue to ${DEST_LABEL[next]}` : 'Finish the route', onClick: actions.continueRoute } : undefined;

  return (
    <div className="voyage" ref={stageRef}>
      <div ref={hostRef} className="voyage-canvas" aria-label="Spaceship view" role="img" />
      <nav className="chips dests" aria-label="Fly to">
        {DESTS.map((d) => (
          <button key={d} className={dest === d ? 'on' : ''} onClick={() => choose(d)}
            style={isPlanet(d) ? { ['--c' as string]: COLOR[d] } : undefined}>
            {destGlyph(d)} {DEST_LABEL[d]}
          </button>
        ))}
      </nav>
      <div className="hud">
        <span className="hud-zone">{SPHERE_NAMES[hud.zone]}</span>
        <span className="hud-right">
          <span className="hud-speed">{status}</span>
          <span className="hud-sub hud-weapon">{MUNITIONS[weapon].name}{weaponLine(weapon, hud)}</span>
          <span className="hud-sub hud-arms">{armsLine(hud.arms)}</span>
          <span className="hud-sub">speed {hud.speed < 10 ? hud.speed.toFixed(1) : Math.round(hud.speed)}{hud.dist !== null && dest ? ` · ${DEST_LABEL[dest]} ${fmtDist(hud.dist)}` : ''}</span>
        </span>
      </div>
      <div ref={reticleRef} className="reticle" aria-hidden="true"><span className="reticle-out">out of arc</span><span className="hitmarker" /></div>
      <div ref={hurtRef} className="hurt-flash" aria-hidden="true" />
      <div ref={aimRef} className="aim-dot" aria-hidden="true" />
      <div ref={flyMarkRef} className="fly-mark" aria-hidden="true" />
      <button className="menu-btn" onClick={() => onMenuRef.current()} aria-label="Menu">☰ Menu</button>
      <div className="nav-btns">
        <button onClick={() => setNav('map')} aria-label="Navigation map">◎ Nav</button>
        <button onClick={() => jumpRef.current?.()} aria-label="Hyperspace jump to the target">⟫ Jump</button>
        {onFull && <button onClick={() => onFullRef.current?.()} aria-label={full ? 'Exit full screen' : 'Full screen'} aria-pressed={full}>{full ? '⤡ Exit' : '⛶ Full'}</button>}
      </div>
      <canvas ref={miniRef} className="minimap" onClick={() => setNav('map')} aria-label="Minimap; opens the navigation map" />
      {route.stops.length > 0 && (
        <div className="route-bar" role="status">
          <span className="rb-text">
            {done ? 'Route complete' : (
              <>
                <strong>Route {route.index + 1}/{route.stops.length}</strong> · {DEST_LABEL[cur!]}
                {' · '}{route.waiting ? 'parked' : route.engaged ? (hud.phase ? PHASE_LABEL[hud.phase].toLowerCase() : 'flying') : 'paused'}
                {hud.leg !== null && !route.waiting && route.engaged && <> · leg {fmtEta(hud.leg)}</>}
                {hud.total !== null && <> · total {fmtEta(hud.total)}</>}
              </>
            )}
          </span>
          {route.waiting && <button className="rb-btn" onClick={actions.continueRoute}>Continue</button>}
          {!route.waiting && !route.engaged && !done && <button className="rb-btn" onClick={actions.startRoute}>Resume</button>}
          {done && <button className="rb-btn" onClick={actions.clearRoute}>Clear</button>}
        </div>
      )}
      <div ref={markerRef} className="target-mark" aria-hidden="true">
        <span className="target-ring" />
        <span className="target-label">{dest ? DEST_LABEL[dest] : ''}{hud.dist !== null ? ` · ${fmtDist(hud.dist)}` : ''}</span>
      </div>
      <div ref={arrowRef} className="target-arrow" aria-hidden="true">➤</div>
      <div ref={lockMarkRef} className="lock-mark" aria-hidden="true"><span className="lock-label">LOCKED</span></div>
      <div ref={leadMarkRef} className="lead-mark" aria-hidden="true" />
      <div ref={boreMarkRef} className="bore-mark" aria-hidden="true" />
      <div ref={noseMarkRef} className="nose-mark" aria-hidden="true" />
      <div ref={pickMarkRef} className="pick-mark" aria-hidden="true" />
      {(hud.stance || hud.pick) && !docked && !inside && (
        <div className="stance-hud" role="status">
          {hud.pick && <span className="sh-pick">◇ {hud.pick}</span>}
          {hud.stance && <span className="sh-stance">{hud.stance}</span>}
        </div>
      )}
      {(overview || ((data.settings.flight?.ovPinned ?? true) && !card)) && !docked && !inside && !nav && (
        <Overview rows={hud.ov} filter={ovFilter} onFilter={(f) => { setOvFilter(f); ovFilterRef.current = f; }} pinned={!overview}
          onPick={(k) => ovPickRef.current(k)} onLock={(k) => lockIconRef.current.ovLock(k)} pickKey={hud.ov.find((r) => r.picked)?.key ?? ''} />
      )}
      {hud.sel && !docked && !inside && !nav && (
        <SelectedPanel sel={hud.sel} stance={hud.stance} onAction={(a) => selActRef.current(a)} onClose={() => { if (apiSel.current) apiSel.current(); }} />
      )}
      {!docked && !inside && !nav && <LockRow locks={hud.locks} onClick={(id) => lockIconRef.current.click(id)} onUnlock={(id) => lockIconRef.current.unlock(id)} />}
      {menu && !nav && <ContextMenu sel={menu.sel} x={menu.x} y={menu.y} onAction={(a) => selActRef.current(a, menu.sel.key)} onClose={() => setMenu(null)} />}
      {note && <p key={note.n} className="flight-note" role="status">{note.text}</p>}
      {banner && (
        <div key={banner.n} className="banner" role="status">
          <span className="banner-title">{banner.outward ? 'Outward' : 'Inward'} · {SPHERE_NAMES[banner.zone]}</span>
        </div>
      )}
      {dockable && !docked && !inside && !card && (
        <button className="enter-btn dock-btn" onClick={() => dockCtl.current.dock()}>Dock at {DEST_LABEL[dockable]} <span className="key-hint">{keyLabel((data.settings.flight?.binds ?? DEFAULT_BINDS)[hud.useOn ? 'use' : 'enter'])}</span></button>
      )}
      {hud.here && !inside && !card && !dockable && (
        <button className="enter-btn" onClick={() => ctl.current.enter()}>Enter {DEST_LABEL[hud.here]} <span className="key-hint">{keyLabel((data.settings.flight?.binds ?? DEFAULT_BINDS)[hud.useOn ? 'use' : 'enter'])}</span></button>
      )}
      {hud.bar.length > 0 && !docked && !inside && (
        <Hotbar slots={hud.bar} selected={slot} onPick={pickSlot}
          keys={(['slot1', 'slot2', 'slot3', 'slot4', 'slot5', 'slot6', 'slot7', 'slot8', 'slot9'] as Action[]).map((a) => keyLabel((data.settings.flight?.binds ?? DEFAULT_BINDS)[a]))} />
      )}
      <div ref={joyBaseRef} className="joy-float" aria-hidden="true"><div ref={joyKnobRef} className="joy-float-knob" /></div>
      {touch && !hud.speed && !dest && <p className="joy-hint">Touch and drag on the left to steer</p>}
      <div className="flight-panel">
        <div className="throttle-track" role="slider" aria-label="Throttle" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hud.throttle * 100)}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setThrottleFrom(e); }}
          onPointerMove={(e) => { if (e.buttons) setThrottleFrom(e); }}>
          <div ref={throttleFillRef} className="throttle-fill" />
          <span className="throttle-label">{Math.round(hud.throttle * 100)}</span>
        </div>
        <div className="flight-buttons">
          <button className={`fbtn ${hud.auto ? 'on' : ''}`} disabled={!dest} onClick={engage}>Auto</button>
          <button className="fbtn" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); boost.current = true; }}
            onPointerUp={() => { boost.current = false; }} onPointerCancel={() => { boost.current = false; }} onContextMenu={(e) => e.preventDefault()}>Boost</button>
          <button className="fbtn stop" onClick={() => { stopReq.current = true; }}>Stop</button>
          <button className="fbtn fire" onPointerDown={() => { firing.current = true; }} onPointerUp={() => { firing.current = false; }}
            onPointerCancel={() => { firing.current = false; }} onPointerLeave={() => { firing.current = false; }} onContextMenu={(e) => e.preventDefault()}>Fire</button>
          <button className="fbtn" onClick={cycleWeapon} aria-label="Switch weapon">{MUNITIONS[weapon].name}</button>
          {loadout.counter && loadout.counter !== 'jammer' && <button className="fbtn" onClick={() => countermeasureRef.current()} aria-label="Countermeasure">{COUNTERS[loadout.counter].name}</button>}
        </div>
      </div>
      <p className="hint voyage-hint">{(() => {
        const b = data.settings.flight?.binds ?? DEFAULT_BINDS;
        return `Double-click space: fly there · click: select · Ctrl+click: lock · right click: menu · drag: camera · 1–4 again: fire at the lock · ${keyLabel(b.forward)}${keyLabel(b.back)}: throttle · ${keyLabel(b.left)}${keyLabel(b.right)}: strafe · Esc: menu and all controls`;
      })()}</p>
      {card && (
        <ArrivalCard dest={card} distance={hud.cardDist} next={continueCard} extra={hooks?.card?.(card)}
          enter={hud.here === card ? () => ctl.current.enter() : undefined}
          dock={card === dockable ? () => dockCtl.current.dock() : undefined}
          onClose={() => { setCard(null); if (routeRef.current.waiting && card === routeCurrent(routeRef.current)) actions.continueRoute(); }} />
      )}
      <div ref={heatRef} className="heat-wash" aria-hidden="true" />
      <AirHud air={hud.air} event={hud.airEvent} />
      <div ref={washRef} className="enter-wash" aria-hidden="true" />
      {docked && <StationScreen id={docked} systems={stationDefRef.current?.summary(docked) ?? undefined} hull={hull} maxHull={PLAYER_HULL} onRepair={() => setHullBoth(PLAYER_HULL)} onUndock={() => dockCtl.current.undock()} onMenu={() => onMenuRef.current()} />}
      {inside && <InsideRoom dest={inside} onLeave={() => ctl.current.leave()} onMenu={() => onMenuRef.current()} />}
      {fleetReady && fleetRef.current && (
        <CommandBar fleet={fleetRef.current} open={cmdMode} onOpen={setCmdMode} lockId={() => combatRef.current?.lock?.craft.id ?? null}
          onTactical={() => setNav('fleet')} keyHint={keyLabel((data.settings.flight?.binds ?? DEFAULT_BINDS).command)} />
      )}
      {nav && <NavOverlay tab={nav} onTab={setNav} onClose={() => setNav(null)} getSnap={() => snapRef.current()} actions={actions}
        fleet={fleetRef.current} />}
    </div>
  );
}
