import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameData, Journey, Settings } from '../lib/store';
import Voyage from './Voyage';
import type { ShipState, VoyageApi } from './Voyage';
import FlightSettings from './FlightSettings';
import { flagOn } from '../flags';
import ControlsList from './controls/ControlsList';
import NewGame from './opening/NewGame';
import Shakedown from './opening/Shakedown';
import { DEFAULT_BINDS, keyLabel } from './controls/bindings';
import { GoalLine, LaunchCard } from './opening/GoalUi';
import PilotHud from './PilotHud';
import Shipyard from './Shipyard';
import RaceCodex from './codex/RaceCodex';
import { createWingmen } from './wingmen';
import { createBoarding } from './boarding';
import type { Boarding } from './boarding';
import type { Prize } from '../lib/boarding/prize';
import type { FlightHooks, Wingmen } from './wingmen';
import type { Craft } from './combat';
import type { NationId } from '../lib/nations';
import { NATIONS, setPlayerNation } from '../lib/nations';
import { destGeometry } from '../lib/nav';
import type { Progress } from '../lib/progression/progress';
import { levelOf } from '../lib/progression/levels';
import { applyKill, flightLoadout, homeSpawn, newProgress } from '../lib/progression/progress';
import { fitStats, loadoutOf } from '../lib/progression/catalog';
import { craftType } from '../lib/progression/refs';
import type { ConquestEvent, ConquestState } from '../lib/conquest/state';
import { cloneConquest, killReward, newConquest, onLoss } from '../lib/conquest/state';
import { grant } from '../lib/conquest/rewards';
import { siteById } from '../lib/conquest/sites';
import { createConquest } from './conquest';
import type { ConquestLayer } from './conquest';
import ConquestHud, { ConquestCard } from './ConquestHud';
import { createInfantry } from './infantry';
import type { InfantryLayer } from './infantry';
import CarrierHud from './CarrierHud';
import type { InfantryState } from '../lib/infantry/carrier';
import { newInfantry } from '../lib/infantry/carrier';
import { SHIP_MODEL_LENGTH } from './space/ship';
import { nationOf } from '../lib/nations';
import type { V3 } from '../lib/nav';

import type { Fit } from '../lib/progression/catalog';
import type { Pilot } from '../lib/opening/profile';
import type { TutorialState } from '../lib/opening/tutorial';
import { newTutorial } from '../lib/opening/tutorial';
import { firstGoal, goalKill, startGoal } from '../lib/opening/goal';
import type { Standings } from '../lib/diplomacy/standings';
import { attitude, bandOf, decayClaims, feudAge, firstRaider, newStandings, shotAt } from '../lib/diplomacy/standings';
import { channelLine, homeSpaceOf, newChallenge, standingAt, stepChallenge } from '../lib/diplomacy/territory';
import type { DirectorState, Threat } from '../lib/motivation/director';
import { ANNOUNCEMENT, newDirector, nextThreat, onTaken, resolveThreat } from '../lib/motivation/director';
import { controlledCount } from '../lib/conquest/state';
import { deathCost } from '../lib/progression/progress';
import { avatarLook, defaultPilot } from '../lib/opening/profile';
import { peopleOf } from '../lib/races';
import PilotHead from './codex/art/PilotHead';
import { AI } from '../lib/aiKnobs';
import type { StationId } from '../lib/stations';
import { STATION_LABEL } from '../lib/stations';

/** What a fleet's change of band sounds like, in the toast. */
const BAND_LINE: Record<string, string> = { hostile: 'are at war with you', wary: 'no longer trust you', friendly: 'have cooled toward you', allied: 'still stand with you' };
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
/** The raid card's captain: the raider's default pilot (lib/opening/profile), for a face and a name. */
const raidCaptain = (n: NationId) => defaultPilot(n).avatar;

/** How often a flight saves itself, so closing the tab mid-tutorial or mid-flight keeps the place. */
const AUTOSAVE_MS = 20000;
/** The berth the tutorial's autopilot and docking lessons use: the first on the home world's armour. */
const homeBerth = (n: NationId) => `stn-${n}-1` as StationId;

/** The codex page `?codex=<nation>` asks for, else Earth's. */
const codexStart = (): NationId => {
  const q = new URLSearchParams(location.search).get('codex');
  return NATIONS.find((n) => n.id === q)?.id ?? 'earth';
};

interface Props {
  data: GameData;
  onSettings: (p: Partial<Settings>) => void;
  onJourney: (j: Journey | null) => void;
  onProgress: (p: Progress, j?: Journey | null) => void; // saved at once; a journey alongside replaces the saved one
  onPrizes: (p: Prize[]) => void; // ships taken by boarding, saved at once
  onConquest: (c: ConquestState, p?: Progress) => void; // the conquest state, with the pilot in the same save
  onInfantry: (i: InfantryState) => void; // carriers mid-operation and the garrisons they left
  onPatch: (p: Partial<GameData>) => void; // any other part of the save (the opening's pilot, tutorial, goal), saved at once
}

/** The main menu, the flight, and the pause menu over it. */
export default function GameView({ data, onSettings, onJourney, onProgress, onPrizes, onConquest, onInfantry, onPatch }: Props) {
  const [mode, setMode] = useState<'menu' | 'new' | 'flight'>('menu');
  const dataRef = useRef(data);
  dataRef.current = data;
  // The launch card shows once, when the tutorial ends (or is skipped); `skipped` says which.
  const [launch, setLaunch] = useState<{ skipped: boolean } | null>(null);
  const [paused, setPaused] = useState(false);
  const [panel, setPanel] = useState<'settings' | 'shipyard' | 'controls' | null>(null);
  // Progression: the pilot (race, level, credits, fit, bay), saved on every change; and the wingmen in flight.
  const progressRef = useRef<Progress | null>(data.progress);
  progressRef.current = data.progress ?? progressRef.current;
  const setProgress = (p: Progress, j?: Journey | null) => { progressRef.current = p; onProgress(p, j); };
  const wingRef = useRef<Wingmen | null>(null);
  const boardRef = useRef<Boarding | null>(null);
  const prizesRef = useRef<Prize[]>(data.prizes ?? []);
  prizesRef.current = data.prizes ?? prizesRef.current;
  // Conquest: every world's ships, sites and production (CONQUEST.md). Mutated in place by the rules; saved with the
  // pilot on every kill, capture and payment, and every few seconds of flight for the production clock.
  const conquestRef = useRef<ConquestState | null>(data.conquest);
  const layerRef = useRef<ConquestLayer | null>(null);
  const saveConquest = (p?: Progress) => { const c = conquestRef.current; if (!c) return; if (p) progressRef.current = p; onConquest(cloneConquest(c), p); };
  // Infantry carriers (INFANTRY-CARRIER.md): mutated in place by lib/infantry, saved with conquest on every event.
  const infantryRef = useRef<InfantryState>(data.infantry ?? newInfantry());
  const infLayerRef = useRef<InfantryLayer | null>(null);
  const saveInfantry = () => onInfantry(JSON.parse(JSON.stringify(infantryRef.current)));
  const getWing = useCallback(() => wingRef.current, []);
  // Standings (GP-01) and the director (GP-02): mutated in place, saved on every change that matters and with the journey.
  const standingsRef = useRef<Standings>(data.standings ?? newStandings());
  const directorRef = useRef<{ t: number; d: DirectorState }>(data.director ?? { t: 0, d: newDirector() });
  const saveDirector = () => onPatch({ director: clone(directorRef.current), standings: clone(standingsRef.current) });
  const [raidCard, setRaidCard] = useState<{ nation: NationId; title: string; line: string; feud: string | null } | null>(null);
  // `?codex` (or `?codex=mars`) opens the races codex at load (races-depth).
  const [codex, setCodex] = useState(new URLSearchParams(location.search).get('codex') !== null);
  const codexOpen = useRef(false);
  codexOpen.current = codex;
  const [spawn, setSpawn] = useState<ShipState | null>(null);
  const [notice, setNotice] = useState('');
  const apiRef = useRef<VoyageApi | null>(null);
  // Full screen: the flight view covers the page, and the browser goes full screen where it allows it
  // (iPhone Safari does not for pages; there the view still fills the window).
  const [full, setFull] = useState(false);
  const setFullscreen = (on: boolean) => {
    setFull(on);
    const d = document;
    if (on && !d.fullscreenElement) {
      // Lock Escape where the browser allows it, so Esc still opens the pause menu (holding it leaves full screen).
      const kb = (navigator as unknown as { keyboard?: { lock?: (k: string[]) => Promise<void> } }).keyboard;
      d.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).then(() => kb?.lock?.(['Escape'])).catch(() => undefined);
    } else if (!on && d.fullscreenElement) d.exitFullscreen().catch(() => undefined);
  };
  useEffect(() => {
    // Leaving full screen from the browser (Esc, a gesture) leaves the full view too.
    const onChange = () => { if (!document.fullscreenElement) setFull(false); };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  useEffect(() => { if (mode !== 'flight' && full) setFullscreen(false); }, [mode, full]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // The flight view covers the page whether or not the browser is in full screen: no page scroll under it.
    document.body.classList.toggle('game-full', mode === 'flight');
    return () => document.body.classList.remove('game-full');
  }, [mode]);

  const journey = data.journey;
  const journeyLabel = journey ? `Saved ${new Date(journey.savedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : '';
  const flash = (t: string) => { setNotice(t); setTimeout(() => setNotice((n) => (n === t ? '' : n)), 2200); };
  const saveQuiet = () => {
    const api = apiRef.current;
    if (!api) return false;
    onJourney({ ship: api.getState(), savedAt: Date.now() });
    saveConquest();
    saveInfantry();
    saveDirector();
    return true;
  };
  const save = () => { if (saveQuiet()) flash('Journey saved'); };
  // Autosave in flight: every AUTOSAVE_MS, and when the page is hidden or closed.
  const saveRef = useRef(saveQuiet);
  saveRef.current = saveQuiet;
  useEffect(() => {
    if (mode !== 'flight') return;
    const first = setTimeout(() => saveRef.current(), 1500); // a new game has a journey to Continue at once
    const id = setInterval(() => { if (!document.hidden) saveRef.current(); }, AUTOSAVE_MS);
    const hide = () => { saveRef.current(); };
    addEventListener('pagehide', hide);
    const vis = () => { if (document.hidden) saveRef.current(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearTimeout(first); clearInterval(id); removeEventListener('pagehide', hide); document.removeEventListener('visibilitychange', vis); };
  }, [mode]);
  const load = () => {
    if (!journey) return;
    apiRef.current?.setState(journey.ship);
    setPaused(false);
    setPanel(null);
  };
  const quitToMenu = () => { save(); setPaused(false); setPanel(null); setMode('menu'); };
  const startNew = () => { setPanel(null); setMode('new'); };
  /**
   * The opening is done: a new game as the pilot's nation, in the fit they chose, at home, with the shakedown flight
   * ahead. Replaces the saved game.
   */
  const beginNew = (pilot: Pilot, fit: Fit) => {
    const nation = pilot.nation;
    setPlayerNation(nation);
    const progress = { ...newProgress(nation), fit };
    progressRef.current = progress;
    // A new game starts with no prizes, a fresh conquest and no carriers out.
    prizesRef.current = [];
    conquestRef.current = newConquest(nation);
    infantryRef.current = newInfantry();
    standingsRef.current = newStandings();
    directorRef.current = { t: 0, d: newDirector() };
    onPatch({ progress, pilot, tutorial: newTutorial(), goal: null, journey: null, prizes: [], conquest: cloneConquest(conquestRef.current), infantry: newInfantry(), standings: null, director: null });
    setLaunch(null);
    setSpawn(homeSpawn(nation, destGeometry())); setPaused(false); setPanel(null); setMode('flight');
  };
  /** The tutorial moved on: save its place and where the ship is, so a reload lands on the same step. */
  const tutorialState = (t: TutorialState) => {
    onPatch({ tutorial: t });
    saveQuiet();
  };
  const finishTutorial = (skipped: boolean) => {
    const d = dataRef.current;
    const nation = progressRef.current?.nation ?? 'earth';
    onPatch({ tutorial: { step: null, done: true, skipped }, goal: d.goal ?? startGoal(nation) });
    setLaunch({ skipped });
    saveQuiet();
  };
  const launchGo = (go: boolean) => {
    const g = dataRef.current.goal;
    const api = apiRef.current;
    if (g && api) {
      const target = firstGoal(g.nation).target;
      if (target) { if (go) api.flyTo(target); else api.setTarget(target); } // the first raid comes to you: no course
    }
    setLaunch(null);
    saveQuiet();
  };
  const continueSaved = () => {
    if (!journey) return;
    const p = progressRef.current ?? newProgress('earth'); // a save from before progression is an Earth pilot
    if (!data.progress) setProgress(p);
    setPlayerNation(p.nation);
    if (!conquestRef.current || conquestRef.current.home !== p.nation) { conquestRef.current = newConquest(p.nation); saveConquest(); }
    setSpawn(journey.ship); setPaused(false); setPanel(null); setMode('flight');
  };
  /** Pay the pilot for what conquest reports, flash what matters, and save it all at once. */
  const onConquestEvents = (ev: ConquestEvent[]) => {
    let p = progressRef.current!;
    const lines: string[] = [];
    let save = false;
    for (const e of ev) {
      if (e.kind === 'reward') { const r = grant(p, e.xp, e.credits); p = r.p; lines.push(...r.lines); if (e.why !== 'income') lines.push(`${e.why}: +${e.xp} XP, +${e.credits} credits`); save = true; }
      if (e.kind === 'launch' || e.kind === 'rebuilt' || e.kind === 'wrecked' || e.kind === 'captured') save = true;
      if (e.kind === 'control') {
        lines.push(`${NATIONS.find((n) => n.id === e.world)!.name}'s world is yours`);
        const D = directorRef.current;
        onTaken(D.d, e.world, D.t, 1 + controlledCount(conquestRef.current!)); // held: your capital plus the worlds you control
        saveDirector();
      }
      if (e.kind === 'rebuilt') lines.push(`${siteById(e.site)!.name} rebuilt`);
    }
    if (save) saveConquest(p);
    if (lines.length) flash(lines.join(' · '));
  };
  const hooks: FlightHooks = {
    attach: ({ combat, shipScale, scene, world, geo }) => {
      const p = progressRef.current!;
      if (!conquestRef.current) { conquestRef.current = newConquest(p.nation); saveConquest(); }
      /** The opening's goal: a kill of the right people moves it on (lib/opening/goal). */
      const goalLines = (c: Craft): string[] => {
        const g = dataRef.current.goal;
        const ng = g ? goalKill(g, c.nation) : null;
        if (!g || !ng || ng === g) return [];
        onPatch({ goal: ng });
        dataRef.current = { ...dataRef.current, goal: ng }; // two kills in one frame (flak, a raid) both count
        return ng.done ? ['Goal complete'] : [];
      };
      const pay = (c: Craft) => {
        const cq = conquestRef.current!;
        const goal = goalLines(c);
        // A raider (GP-02) is not one of its world's patrol: it pays in full and leaves the world's navy as it was.
        if (c.raid) { const rw = killReward(craftType(c), true); const r = grant(progressRef.current!, rw.xp, rw.credits, 1); setProgress(r.p); r.lines.unshift(...goal); if (r.lines.length) flash(r.lines.join(' · ')); return; }
        if (c.nation === cq.home) { const r = applyKill(progressRef.current!, craftType(c)); setProgress(r.p); r.lines.unshift(...goal); if (r.lines.length) flash(r.lines.join(' · ')); return; }
        // A world's own ships: its original force pays in full, the ships it rebuilt pay half (lib/conquest).
        const { veteran } = onLoss(cq, c.nation, craftType(c));
        const reward = killReward(craftType(c), veteran);
        const r = grant(progressRef.current!, reward.xp, reward.credits, 1);
        saveConquest(r.p);
        r.lines.unshift(...goal);
        if (r.lines.length) flash(r.lines.join(' · '));
      };
      combat.hooks.onKill = (c) => { if (c.hostile && !c.drill) pay(c); }; // the player's own ships and the tutorial's drill targets pay nothing
      // Drill boarders (DRILL-BOARDER.md): T boards the locked ship; a capture pays like a kill.
      const bd = createBoarding(combat, {
        shipScale, playerNation: p.nation, prizes: prizesRef.current, bodies: destGeometry(),
        onPrizes: (list) => { prizesRef.current = list; onPrizes(list); }, onCapture: pay, notify: flash,
      });
      boardRef.current = bd;
      const layer = createConquest({ scene, combat, world, geo, playerLength: SHIP_MODEL_LENGTH * shipScale, state: () => conquestRef.current!, onEvents: onConquestEvents });
      layerRef.current = layer;
      const inf = createInfantry({
        scene, combat, conquest: layer, playerLength: SHIP_MODEL_LENGTH * shipScale,
        state: () => infantryRef.current, cq: () => conquestRef.current!, nation: () => progressRef.current!.nation,
        level: () => levelOf(progressRef.current!.xp), credits: () => progressRef.current!.credits,
        spend: (n) => setProgress({ ...progressRef.current!, credits: Math.max(0, progressRef.current!.credits - n) }),
        onConquest: onConquestEvents,
        onEvents: (lines, save) => { if (save) { saveInfantry(); saveConquest(); } if (lines.length) flash(lines.join(' · ')); },
      });
      infLayerRef.current = inf;
      let sinceSave = 0;
      let lastShip: V3 = [0, 0, 0];
      const wm = createWingmen(combat.root, combat, {
        color: NATIONS.find((n) => n.id === p.nation)!.color, shipScale,
        dps: fitStats(loadoutOf(p.nation, 'fighter')).dps, bay: () => progressRef.current?.fighters ?? 0,
      });
      wingRef.current = wm;

      // ---- GP-01: every fleet reads its house's standing toward yours; a shot at a fleet not at war moves it ----
      const st = standingsRef.current;
      const nameOf = (n: NationId) => NATIONS.find((x) => x.id === n)!.name;
      // ---- D1 (scale-jump-danger): foreign space. A house's home space challenges a ship it does not welcome and then
      // fires on it (lib/diplomacy/territory.ts); its fleets and its station guns read that through these hooks ----
      const ch = newChallenge();
      let firedAt: Partial<Record<NationId, boolean>> = {};
      const standingOf = (n: NationId) => standingAt(st, n, p.nation);
      combat.ai.hooks.attitudeOf = (n) => {
        const nn = n as NationId;
        if (ch.free[nn]) return 'engage';
        if (ch.host === nn) { const s = standingOf(nn); if (s === 'own' || s === 'passage') return 'hold'; if (s === 'challenge') return 'shadow'; }
        return attitude(st, nn, p.nation);
      };
      combat.ai.hooks.summoned = (n) => ch.host === n && ['challenge', 'enemy'].includes(standingOf(n as NationId));
      const territory = (dt: number, pos: V3) => {
        const host = homeSpaceOf(pos, geo());
        const ev = stepChallenge(ch, dt, host, host ? standingOf(host) : null, !!(host && firedAt[host]));
        firedAt = {};
        for (const e of ev) flash(channelLine(e, nameOf(e.host), nameOf(p.nation)));
      };
      if (import.meta.env.DEV) (window as unknown as { __territory?: unknown }).__territory = { ch, standingOf };
      const lastShot: Partial<Record<NationId, number>> = {};
      combat.ai.hooks.onProvoke = (n) => {
        const nn = n as NationId;
        if (nn !== p.nation) firedAt[nn] = true; // fired on a challenger: weapons free now
        if (nn === p.nation || combat.time - (lastShot[nn] ?? -99) < 5) return; // one offence per burst
        lastShot[nn] = combat.time;
        const before = bandOf(st, nn, p.nation);
        const after = shotAt(st, nn, p.nation);
        if (after !== before) { flash(`The ${nameOf(nn)} ${BAND_LINE[after] ?? 'remember that'}`); saveDirector(); }
      };

      // ---- GP-02: the director, on flight time from the first undock. The feud raid is played; other threats are
      // dealt and logged (Wave B plays them) ----
      let raid: { th: Threat; crafts: Craft[]; kills: number } | null = null;
      let think = 0;
      let docked = false;
      const dirLog: { t: number; kind: string; label: string; played: boolean }[] = [];
      const endRaid = (beaten: boolean) => {
        const D = directorRef.current;
        for (const c of raid!.crafts) if (combat.crafts.includes(c)) combat.dropRaid(c);
        resolveThreat(D.d, raid!.th, D.t);
        flash(beaten ? 'Raid beaten' : 'The raiders broke off');
        raid = null;
        saveDirector();
      };
      const deal = (th: Threat, pos: V3) => {
        const D = directorRef.current;
        dirLog.push({ t: D.t, kind: th.kind, label: th.label, played: th.kind === 'feudRaid' || ANNOUNCEMENT.includes(th.kind) });
        if (th.kind === 'feudRaid' && th.world && th.force) {
          const home = NATIONS.find((n) => n.id === th.world)!.home;
          const from = geo().find((g) => g.id === home)?.pos ?? ([pos[0], pos[1], pos[2] + 1] as V3);
          const first = D.d.feudRaids === 0;
          // The first raid is pickets testing your house: level-1 fits, so a level-1 pilot who fights back wins it.
          const crafts = combat.raid(th.world, { fighter: th.force.fighter, cruiser: th.force.cruiser }, pos, from, AI.alertRange * combat.arsenal.scale * 5, first ? 1 : undefined);
          raid = { th, crafts, kills: 0 };
          const cap = raidCaptain(th.world);
          setRaidCard({
            nation: th.world,
            title: first ? `${peopleOf(th.world).demonym} raiders inbound` : th.label,
            line: `${cap.name}, on the open channel: "${first ? 'Turn your ship around, and we let you live to tell your masters.' : 'We came back, as we said we would.'}"`,
            feud: feudAge(p.nation, th.world),
          });
          setTimeout(() => setRaidCard(null), 8000);
          // The first raid is the opening's goal (it replaced the stand-in "break their patrol").
          if (first && !dataRef.current.goal) onPatch({ goal: startGoal(p.nation) });
          saveDirector();
          return;
        }
        resolveThreat(D.d, th, D.t);
        if (ANNOUNCEMENT.includes(th.kind)) flash(th.label);
        saveDirector();
      };
      const direct = (dt: number, pos: V3) => {
        const tut = dataRef.current.tutorial;
        if (tut && !tut.done) return; // the shakedown first
        think += dt;
        if (think >= 0.5) { think = 0; docked = !!apiRef.current?.probe().docked; }
        if (docked) return; // the clock runs from the first undock
        const D = directorRef.current;
        D.t += dt / 60;
        decayClaims(st, dt / 60);
        if (raid) {
          for (const c of raid.crafts) {
            if (!combat.crafts.includes(c)) continue;
            const m = combat.ai.modeOf(c.id);
            if (c.alive && (m === 'return' || m === 'patrol')) combat.dropRaid(c); // it ran
          }
          const left = raid.crafts.filter((c) => c.alive && combat.crafts.includes(c));
          if (!left.length) endRaid(raid.crafts.every((c) => !c.alive && combat.crafts.includes(c)));
          return;
        }
        if (think !== 0) return;
        const th = nextThreat(D.d, {
          t: D.t, held: 1 + controlledCount(conquestRef.current!), broken: 0, dominance: 1, rank: 0, unrest: {}, heldSince: {}, sinceRung: 0,
          raider: firstRaider(st, p.nation),
        });
        if (th) deal(th, pos);
      };
      if (import.meta.env.DEV) (window as unknown as { __director?: unknown }).__director = {
        get t() { return directorRef.current.t; }, get d() { return directorRef.current.d; }, get raid() { return raid; }, log: dirLog, standings: st,
        /** Dev: run the director's clock forward (minutes) without flying. */
        skip: (min: number) => { directorRef.current.t += min; },
      };

      const cq = {
        update: (dt: number, pos: V3) => {
          lastShip = pos;
          layer.update(dt, pos);
          inf.update(dt, pos);
          sinceSave += dt;
          if (sinceSave > 5) { sinceSave = 0; saveConquest(); } // the production clock, stockpiles and repairs
        },
        /** Dev and tests: run the conquest clock forward without flying (the ship stays put). */
        jump: (secs: number, step = 1) => { for (let t = 0; t < secs; t += step) { layer.update(step, lastShip); inf.update(step, lastShip); } saveConquest(); saveInfantry(); },
      };
      if (import.meta.env.DEV) (window as unknown as { __conquest?: unknown }).__conquest = { get state() { return conquestRef.current; }, layer, jump: cq.jump, save: () => saveConquest() };
      if (import.meta.env.DEV) (window as unknown as { __infantry?: unknown }).__infantry = { get state() { return infantryRef.current; }, layer: inf, order: inf.order, recall: inf.recall, view: inf.view, problem: inf.problem, jump: cq.jump, save: () => { saveInfantry(); saveConquest(); } };
      return {
        update: (dt, pos, fwd, vel) => { wm.update(dt, pos, fwd, vel); bd.update(dt, pos, fwd); cq.update(dt, pos); direct(dt, pos); territory(dt, pos); },
        // GP-15a: a lost ship loses the fighters it had out, the troops in its bay and a tenth of its credits, and comes
        // back at the nearest station of a world you hold (your capital's, or a world you control).
        lost: (_pos, cost) => {
          const r = deathCost(progressRef.current!, wm.lose());
          setProgress(r.p);
          let squads = 0;
          for (const car of infantryRef.current.carriers) if (car.side === 'player' && car.phase === 'docked') { squads += car.squads.length; car.squads = []; }
          if (squads) saveInfantry();
          const parts = [`-${r.credits} credits`];
          if (r.fighters) parts.push(`${r.fighters} fighter${r.fighters > 1 ? 's' : ''}`);
          if (cost.drones) parts.push(`${cost.drones} drone${cost.drones > 1 ? 's' : ''}`);
          if (squads) parts.push(`${squads} squad${squads > 1 ? 's' : ''} aboard`);
          flash(`Ship lost: ${parts.join(' · ')}`);
          const cqs = conquestRef.current!;
          return [cqs.home, ...NATIONS.map((n) => n.id).filter((w) => w !== cqs.home && cqs.worlds[w]?.controlled)];
        },
        key: (k) => {
          if (bd.key(k)) return true;
          if (k === 'b') { if (!wm.launch()) flash(progressRef.current?.fighters ? 'Every fighter is out' : 'No fighters in the bay'); return true; }
          if (k === 'v') { wm.recall(); return true; }
          if (k === 'l') { inf.order(); return true; } // land the infantry carrier at the nearest site that can be taken
          if (k === 'k') { inf.recall(); return true; }
          return false;
        },
        dispose: () => { inf.dispose(); if (infLayerRef.current === inf) infLayerRef.current = null; wm.dispose(); bd.dispose(); if (wingRef.current === wm) wingRef.current = null; if (boardRef.current === bd) boardRef.current = null; layer.dispose(); if (layerRef.current === layer) layerRef.current = null; },
      };
    },
    loadout: () => flightLoadout(progressRef.current!),
    level: () => levelOf(progressRef.current?.xp ?? 0),
    utility: () => {
      const bay = progressRef.current?.fighters ?? 0;
      const out = wingRef.current?.view().filter((w) => w.state !== 'docked').length ?? 0;
      return { fighters: bay ? { bay, out } : null, infantry: infLayerRef.current ? { out: infLayerRef.current.view().length } : null };
    },
    card: (d) => { const n = nationOf(d); const c = conquestRef.current; return n && c ? <ConquestCard world={n.id} state={c} /> : null; },
  };
  if (import.meta.env.DEV) (window as unknown as { __pilot?: unknown }).__pilot = { get progress() { return progressRef.current; }, get wing() { return wingRef.current; }, get boarding() { return boardRef.current; }, setProgress };
  // Esc in flight toggles the pause menu, except while the codex is open over it: then it only closes the codex.
  const toggleMenu = () => {
    if (codexOpen.current) { setCodex(false); return; }
    setPaused((p) => !p); setPanel(null);
  };
  const getApi = useCallback(() => apiRef.current, []);
  // The shakedown flight runs while the save says it is not done (a save from before the opening has none: no tutorial).
  const tutorialOn = !!data.tutorial && !data.tutorial.done && !!data.tutorial.step;
  const settingsPanel = (
    <>
      <h2>Settings</h2>
      <FlightSettings flight={data.settings.flight} onChange={(flight) => onSettings({ flight })} />
      <div className="menu-col">
        <button className="btn" onClick={() => setPanel(null)}>Back</button>
      </div>
    </>
  );

  return (
    <>
      {mode === 'flight' ? (
        <div className={full ? 'flight-wrap full' : 'flight-wrap'}>
          <Voyage data={data} paused={paused} onMenu={toggleMenu} spawn={spawn} apiRef={apiRef}
            full={full} onFull={() => setFullscreen(!full)} onLoadout={() => { setPaused(true); setPanel(data.progress ? 'shipyard' : null); }} hooks={hooks}
            look={data.pilot ? { nation: data.pilot.nation, ship: data.pilot.ship } : null} />
          {data.progress && <PilotHud progress={data.progress} pilot={data.pilot} wing={getWing} />}
          <ConquestHud view={() => layerRef.current?.view ?? null} state={() => conquestRef.current} />
          <CarrierHud view={() => infLayerRef.current?.view() ?? []} />
          {tutorialOn && data.tutorial && (
            <Shakedown api={getApi} state={data.tutorial} home={homeBerth(data.progress?.nation ?? 'earth')}
              homeLabel={STATION_LABEL[homeBerth(data.progress?.nation ?? 'earth')]} binds={data.settings.flight?.binds ?? DEFAULT_BINDS} paused={paused}
              onState={tutorialState} onFinish={finishTutorial} />
          )}
          {data.goal && !tutorialOn && !launch && <GoalLine goal={data.goal} />}
          {raidCard && !paused && (
            <div className="raid-card" role="alert" aria-label="Raid">
              <div className="raid-portrait"><PilotHead nation={raidCard.nation} look={avatarLook(raidCard.nation, raidCaptain(raidCard.nation))} label={raidCaptain(raidCard.nation).name} /></div>
              <div className="raid-text">
                <p className="op-kicker">{raidCard.feud ? `The feud: ${raidCard.feud}` : 'A company hired against you'}</p>
                <h3>{raidCard.title}</h3>
                <p>{raidCard.line}</p>
              </div>
            </div>
          )}
          {launch && data.goal && !paused && <LaunchCard goal={data.goal} pilot={data.pilot} skipped={launch.skipped} autoKey={keyLabel((data.settings.flight?.binds ?? DEFAULT_BINDS).autopilot)} onGo={() => launchGo(true)} onSelf={() => launchGo(false)} />}
          {paused && (
            <div className="game-menu-backdrop" role="dialog" aria-label="Paused">
              <div className="game-menu parchment">
                {panel === 'settings' ? settingsPanel : panel === 'controls' ? (
                  <>
                    <h2>Controls</h2>
                    <ControlsList binds={data.settings.flight.binds} />
                    <div className="menu-col"><button className="btn" onClick={() => setPanel(null)}>Back</button></div>
                  </>
                ) : panel === 'shipyard' && data.progress ? (
                  <Shipyard progress={data.progress} look={data.pilot?.ship} onChange={(p) => setProgress(p)} onBack={() => setPanel(null)} />
                ) : (
                  <>
                    <h2>Paused</h2>
                    <div className="menu-col">
                      <button className="btn" onClick={toggleMenu} autoFocus>Resume</button>
                      <button className="btn ghost" onClick={save}>Save journey</button>
                      <button className="btn ghost" onClick={load} disabled={!journey}>Load saved journey</button>
                      {journey && <span className="menu-note">{journeyLabel}</span>}
                      <button className="btn ghost" onClick={() => apiRef.current?.openNav('map')}>Navigation</button>
                      <button className="btn ghost" onClick={() => setFullscreen(!full)}>{full ? 'Exit full screen' : 'Full screen'}</button>
                      <button className="btn ghost" onClick={() => setPanel('shipyard')}>Shipyard</button>
                      <button className="btn ghost" onClick={() => setCodex(true)}>Peoples of the System</button>
                      <button className="btn ghost" onClick={() => setPanel('controls')}>Controls</button>
                      <button className="btn ghost" onClick={() => setPanel('settings')}>Settings</button>
                      <button className="btn ghost danger" onClick={quitToMenu}>Quit to main menu</button>
                    </div>
                    <p className="small muted">Esc to resume · F11: full screen. Quitting saves your journey.</p>
                  </>
                )}
              </div>
            </div>
          )}
          {notice && <div className="menu-toast" role="status">{notice}</div>}
          {codex && paused && <RaceCodex onClose={() => setCodex(false)} />}
        </div>
      ) : mode === 'new' ? (
        <NewGame onDone={beginNew} onBack={() => setMode('menu')} replaces={!!journey || !!data.progress} />
      ) : (
        <div className="main-menu-wrap title-menu">
          <div className="game-menu main parchment">
            {panel === 'settings' ? settingsPanel : (
              <>
                <h2 className="menu-title">Ascent Flight</h2>
                <div className="menu-col">
                  {journey && <button className="btn" onClick={continueSaved}>Continue</button>}
                  {journey && <span className="menu-note">{data.pilot ? `${data.pilot.avatar.name} · ${data.pilot.ship.name} · ` : ''}{journeyLabel}</span>}
                  <button className={journey ? 'btn ghost' : 'btn'} onClick={startNew}>New game</button>
                  {/* PKG-21 (F-01): Phase A's battle, behind the skirmish flag; it opens ?skirmish, which never touches the save. */}
                  {flagOn('skirmish') && <button className="btn ghost" onClick={() => { window.location.search = '?skirmish'; }}>Fleet battle</button>}
                  <button className="btn ghost" onClick={() => setCodex(true)}>Peoples of the System</button>
                  <button className="btn ghost" onClick={() => setPanel('settings')}>Settings</button>
                </div>
                <p className="small muted">In flight, Esc opens the menu.</p>
              </>
            )}
          </div>
        </div>
      )}
      {codex && mode === 'menu' && <RaceCodex onClose={() => setCodex(false)} start={codexStart()} />}
    </>
  );
}
