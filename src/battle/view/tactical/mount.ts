/**
 * The tactical view (PKG-12; VISION §7a, §16 T1; BRIDGE §12b rules 3–4), wired to the skirmish.
 *
 * T opens it: time runs at 25% through the feed's time scale (never 0), the camera rises to a top-down-ish view over
 * the battle and holds both fleets, the director pauses its cuts, the scene goes faint under a grid on the ring plane,
 * and every ship is a glowing icon by class with its four shield arcs (his own: true; the enemy's: only what his ships
 * saw land). T again closes it: 1x, and the camera he had.
 *
 * The maneuver picker works in either view: choose a maneuver from the order menu, click a target, see the ghost line
 * and its time to completion, Enter (or click the target again) commits, Esc cancels.
 *
 * Probe: `state('tactical')`; `act('tactical', {on})`, `act('tactical.maneuver', {name, ships?, target?})`,
 * `act('tactical.target', {ship})`, `act('tactical.ship', {ship})`, `act('tactical.commit')`, `act('tactical.cancel')`,
 * `act('tactical.helm', {ship, name, target, helms?})` (EXP-03 step 7, on copies of the battle).
 */
import { registerProbeSource } from '../../../dev/probeSources';
import { flagOn } from '../../../flags';
import type { Battle, CommandResult, ManeuverName, SideId } from '../../sim/index';
import { MANEUVER_NAMES, flightOf, limitsOf, order as simOrder, plan, previewManeuver, step as simStep } from '../../sim/index';
import type { CameraMode, CameraRig } from '../camera';
import { CAM, eyeOf } from '../camera';
import type { CommsController } from '../comms/controller';
import type { DirectorMount } from '../director/mount';
import type { V3 } from '../model';
import type { BattleView } from '../scene';
import type { SimFeed } from '../simFeed';
import { SIM_VIEW } from '../simFeed';
import { createHolo } from './holo';
import { createIntel, readIntel, shieldArcs } from './intel';
import { TAC } from './numbers';
import { clock, tacticalSvg } from './overlay';
import type { XZ } from './paths';
import { distToPath } from './paths';
import { MANEUVER_LABELS, cannotFly, createPicker } from './picker';
import { ESCORT_WARNING, escortOnScreen } from '../input/escort';
import './tactical.css';

const SVG = 'http://www.w3.org/2000/svg';
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export interface TacticalMount {
  enabled(): boolean;
  on(): boolean;
  /** Open or close (no argument: the other way). */
  toggle(on?: boolean): { on: boolean; timeScale: number };
  /** PKG-21 F-11: R (when it is the camera key) in the tactical view: back to the tactical camera as T opened it. */
  resetView(): void;
  /** After every fixed battle step: what his ships saw, and the flown-vs-ghost and turn-rate checks. */
  step(): void;
  reset(): void;
  act(verb: string, args: Record<string, unknown>): unknown;
  verbs: string[];
  dispose(): void;
}

interface Tracked { ship: string; name: ManeuverName; t0: number; ghost: XZ[]; maxDev: number; samples: number; end: string | null }
interface Turn { inFlight: number; afterBreak: number; breakAt: number | null; overall: number }

export function mountTactical(o: { host: HTMLElement; view: BattleView; rig: CameraRig; sim: SimFeed; director: DirectorMount; comms: CommsController | null }): TacticalMount {
  const { host, view, rig, sim, director, comms } = o;
  const b = (): Battle => sim.battle();
  const side = (): SideId => b().comms?.side ?? 'player';
  let open = false;
  let saved: { mode: CameraMode; yaw: number; pitch: number; dist: number; focus: string | null } | null = null;
  let intel = createIntel();
  let tracked: Tracked[] = [];
  let turns = new Map<string, Turn>();
  let lastH = new Map<string, number>();
  let seen = -1;
  let replot = -1;
  const timeLog: { t: number; on: boolean; timeScale: number }[] = [];
  let inputsAtOpen = -1;

  /** Pull the tactical camera back to hold every ship in the field (k: 1 snaps, less eases), until he takes it. */
  const holdAll = (k: number) => {
    const s = rig.state;
    if (s.inputs !== inputsAtOpen) return;
    const f = sim.frame();
    const live = f.ships.filter((x) => x.status === 'alive' || x.status === 'broken');
    let r = 0;
    for (const x of live) r = Math.max(r, Math.hypot(x.pos[0] - s.target[0], x.pos[2] - s.target[2]));
    // A ghost line being chosen stays on the table too.
    const g = picker.state().preview;
    const M = SIM_VIEW.metresPerUnit;
    if (g) for (const pts of Object.values(g.path)) for (const p of pts) r = Math.max(r, Math.hypot(p.x / M - s.target[0], p.z / M - s.target[2]));
    const want = Math.min(CAM.maxDist, Math.max(TAC.dist, r * TAC.holdK));
    s.dist += (want - s.dist) * k;
    s.eye = eyeOf(s);
  };

  const holo = createHolo(view);
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'tac-overlay');
  svg.setAttribute('aria-hidden', 'true');
  host.appendChild(svg);
  const badge = document.createElement('div');
  badge.className = 'tac-badge';
  badge.hidden = true;
  host.appendChild(badge);
  const panel = document.createElement('div');
  panel.className = 'tac-panel';
  panel.setAttribute('role', 'status');
  panel.hidden = true;
  host.appendChild(panel);
  // PKG-21 (F-05, TRC05-7): what the last Commit or Enter answered when it did not order anything, for a few seconds.
  const notice = document.createElement('div');
  notice.className = 'tac-notice';
  notice.setAttribute('role', 'status');
  notice.hidden = true;
  host.appendChild(notice);
  let noticeTimer = 0;
  const say = (text: string | null) => {
    if (!text) return;
    notice.textContent = text;
    notice.hidden = false;
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => { notice.hidden = true; }, TAC.noticeMs);
  };
  // PKG-21 F-15: a Tactical button (shown at phone width by tactical.css; T is the key elsewhere).
  const tbtn = document.createElement('button');
  tbtn.type = 'button';
  tbtn.className = 'tac-toggle';
  tbtn.textContent = 'Tactical';
  tbtn.setAttribute('aria-pressed', 'false');
  tbtn.hidden = !flagOn('tactical');
  tbtn.onclick = () => { if (flagOn('tactical')) setOpen(!open); };
  host.appendChild(tbtn);

  const shipName = (id: string | null) => (id ? b().ships.find((s) => s.id === id)?.name ?? id : null);
  const picker = createPicker(b, side, () => { comms?.refresh(); drawPanel(); });

  // ── The panel: what is being chosen, the ghost's time, and the two ways out ────────────────────────────────────
  let panelKey = '';
  const drawPanel = () => {
    const st = picker.state();
    const escort = st.stage !== 'idle' && escortOnScreen(b(), st.ships[0] ?? null);
    const key = st.stage === 'idle' ? '' : `${st.stage}|${st.label}|${st.ships.join(',')}|${st.target}|${st.preview ? Math.round(st.preview.eta) : ''}|${st.preview?.refused.length ?? ''}|${st.why}|${escort}`;
    if (key === panelKey) return;
    panelKey = key;
    panel.hidden = st.stage === 'idle';
    if (st.stage === 'idle') { panel.replaceChildren(); return; }
    const who = st.ships.map(shipName).join(', ');
    const line = document.createElement('p');
    const b1 = document.createElement('b');
    b1.textContent = st.label ?? '';
    line.append(b1, ` · ${who}`);
    if (st.target) line.append(` → ${shipName(st.target)}`);
    const sub = document.createElement('p');
    sub.className = 'tac-sub';
    if (st.stage === 'target') sub.textContent = st.why ?? 'Click an enemy ship for the target · click your ships to add or drop them · Esc cancels';
    else if (st.stage === 'refused') { sub.className = 'tac-sub tac-why'; sub.textContent = `${st.why} Enter or Commit closes this; Esc cancels.`; }
    else {
      const p = st.preview!;
      const eta = document.createElement('b');
      eta.className = 'tac-eta-text';
      eta.textContent = `${clock(p.eta)}${p.complete ? '' : '+'}`;
      sub.append('Time to complete ', eta, st.target ? '' : ' · threat: the nearest enemy (click one to choose)');
      if (p.refused.length) sub.append(` · cannot: ${p.refused.map((r) => `${shipName(r.ship)} (${r.reason})`).join('; ')}`);
    }
    const row = document.createElement('div');
    row.className = 'tac-actions';
    const go = document.createElement('button');
    go.type = 'button';
    go.textContent = 'Commit ⏎';
    go.disabled = st.stage === 'target' && !st.target && !st.why;
    go.onclick = () => { commitAndSay(); };
    const no = document.createElement('button');
    no.type = 'button';
    no.className = 'cx-dim-button';
    no.textContent = 'Cancel Esc';
    no.onclick = () => picker.cancel();
    row.append(go, no);
    const parts: HTMLElement[] = [line, sub];
    if (escort) {
      const w = document.createElement('p');
      w.className = 'tac-escort-warn';
      w.textContent = `${ESCORT_WARNING}: the flagship loses her screen.`;
      parts.push(w);
    }
    panel.replaceChildren(...parts, row);
  };

  // ── Drawing, after every render (works by hand with the pane hidden) ──────────────────────────────────────────
  const draw = () => {
    const B = b();
    const f = sim.frame();
    if (f.outcome && picker.active()) picker.cancel(); // PKG-21 F-05: the bar never outlives the battle
    if (picker.active() && B.t - replot >= 0.5) { replot = B.t; picker.refresh(); }
    if (open) {
      const live = f.ships.filter((s) => s.status === 'alive' || s.status === 'broken');
      const c: V3 = [0, 0, 0];
      for (const s of live) for (let i = 0; i < 3; i++) c[i] += s.pos[i] / Math.max(1, live.length);
      holo.centre(c);
    }
    const st = picker.state();
    const sel = comms?.snapshot().selected ?? null;
    svg.setAttribute('viewBox', `0 0 ${view.renderer.domElement.clientWidth} ${view.renderer.domElement.clientHeight}`);
    svg.innerHTML = tacticalSvg(view, {
      frame: f, own: 0, arcs: open ? shieldArcs(B, side(), intel) : {}, selected: sel,
      ghost: st.stage === 'ghost' ? st.preview : null, ghostLabel: st.label, choosing: st.ships, holo: open,
    });
    drawPanel();
  };
  view.afterRender.push(draw);

  // ── Open and close ─────────────────────────────────────────────────────────────────────────────────────────────
  const setOpen = (on: boolean) => {
    if (on === open) return;
    open = on;
    const s = rig.state;
    if (on) {
      saved = { mode: s.mode, yaw: s.yaw, pitch: s.pitch, dist: s.dist, focus: s.focus };
      director.pause(true);
      // The tactical camera: high over the middle of the battle (scene.ts keeps the look-at point on it while nothing is
      // focused), pulled back to hold every ship until he moves it himself. The director is paused: nothing cuts away.
      s.mode = 'player';
      s.focus = null;
      s.pitch = TAC.pitch;
      // His fleet at the bottom of the table, the enemy's at the top: the yaw that puts the line between them up-screen.
      const f = sim.frame();
      const mid = (side: number) => {
        const xs = f.ships.filter((x) => x.side === side && (x.status === 'alive' || x.status === 'broken'));
        return xs.length ? [xs.reduce((a, x) => a + x.pos[0], 0) / xs.length, xs.reduce((a, x) => a + x.pos[2], 0) / xs.length] : null;
      };
      const mo = mid(0), me = mid(1);
      // On a tall screen (a phone held upright) the lines stand as columns instead, his on the left: two lines abreast
      // would be squeezed into 375 px.
      const tall = host.clientHeight > host.clientWidth;
      if (mo && me && Math.hypot(me[0] - mo[0], me[1] - mo[1]) > 1) s.yaw = Math.atan2(-(me[0] - mo[0]), -(me[1] - mo[1])) + (tall ? TAC.tallTurn : 0);
      inputsAtOpen = s.inputs;
      holdAll(1);
      sim.timeScale = TAC.timeScale;
    } else {
      if (saved) { s.mode = saved.mode; s.yaw = saved.yaw; s.pitch = saved.pitch; s.dist = saved.dist; s.focus = saved.focus; s.eye = eyeOf(s); }
      saved = null;
      director.pause(false);
      sim.timeScale = TAC.normalScale;
    }
    holo.set(on);
    host.classList.toggle('is-tactical', on);
    tbtn.setAttribute('aria-pressed', String(on));
    tbtn.textContent = on ? 'Close tactical' : 'Tactical';
    host.parentElement?.classList.toggle('is-tactical', on);
    badge.hidden = !on;
    badge.replaceChildren();
    if (on) {
      const hint = document.createElement('span');
      hint.className = 'tac-badge-hint';
      hint.textContent = ' · T to close';
      badge.append(`Tactical · time ${Math.round(TAC.timeScale * 100)}%`, hint);
    }
    timeLog.push({ t: b().t, on, timeScale: sim.timeScale });
    view.ingest(sim.frame(), 0); // the camera moves on the input frame
    view.render();
  };

  // ── Clicks on the battle while choosing (the comms controller asks first) and Enter / Esc ──────────────────────
  const hooks = {
    enabled: () => flagOn('tactical'),
    choose: (name: ManeuverName, target: string | null = null, ship: string | null = null) => {
      const sel = ship ?? comms?.snapshot().selected; // PKG-21 F-13: the ship the bar or menu names
      if (sel) picker.choose(name, [sel], target);
    },
    cannot: (name: ManeuverName, ship: string) => cannotFly(b(), ship, name),
    intercept: (id: string, own: boolean) => {
      if (!picker.active()) return false;
      const st = picker.state();
      if (own) picker.toggleShip(id);
      else if ((st.stage === 'ghost' || st.stage === 'refused') && st.target === id) commitAndSay();
      else picker.target(id);
      return true;
    },
  };
  if (comms) comms.maneuvers = hooks;
  const key = (e: KeyboardEvent) => {
    if (!picker.active()) return;
    if (e.key === 'Enter') { e.preventDefault(); commitAndSay(); }
    else if (e.key === 'Escape') { e.preventDefault(); picker.cancel(); }
  };
  window.addEventListener('keydown', key);

  // ── Per step: intel, the ghost-vs-flown check, the turn-rate check ─────────────────────────────────────────────
  const commitTrack = (r: CommandResult | null) => {
    const last = picker.state().last;
    if (!r?.ok || !last) return;
    for (const [ship, pts] of Object.entries(last.preview.path)) {
      const f = flightOf(b(), ship);
      if (f) tracked = [...tracked.filter((t) => t.ship !== ship), { ship, name: last.preview.name, t0: f.t0, ghost: pts.map((p) => ({ x: p.x, z: p.z })), maxDev: 0, samples: 0, end: null }];
    }
  };
  const origCommit = picker.commit;
  picker.commit = () => { const r = origCommit(); commitTrack(r); return r; };
  /** Enter, the Commit button, a second click on the target: commit, and say out loud what did not go (F-05, TRC05-7). */
  const commitAndSay = () => {
    const r = picker.commit();
    if (r && !r.ok && !picker.active()) say(r.reason);
    return r;
  };

  const step = () => {
    const B = b();
    if (B.outcome && picker.active()) picker.cancel(); // PKG-21 F-05
    if (open) holdAll(1 - Math.exp(-CAM.follow * B.dt));
    readIntel(intel, B, side());
    // Maneuver events since last step: where a flight ended, and why.
    const total = B.logDropped + B.log.length;
    if (seen < 0) seen = B.logDropped;
    const fresh = Math.min(total - seen, B.log.length);
    for (let i = B.log.length - fresh; i < B.log.length; i++) {
      const e = B.log[i];
      if (e.kind !== 'maneuver' || e.phase === 'start') continue;
      const t = tracked.find((x) => x.ship === e.ship && !x.end);
      if (t) t.end = `${e.phase} at ${e.t}`;
      if (e.phase === 'brokenOff') { const u = turns.get(e.ship); if (u) { u.breakAt = e.t; u.afterBreak = 0; } }
    }
    seen = total;
    for (const t of tracked) {
      if (t.end) continue;
      const s = B.ships.find((x) => x.id === t.ship);
      const f = flightOf(B, t.ship);
      if (!s || !f || f.t0 !== t.t0) continue;
      t.maxDev = Math.max(t.maxDev, distToPath({ x: s.pos.x, z: s.pos.z }, t.ghost));
      t.samples++;
    }
    for (const s of B.ships) {
      if (s.side !== side() || s.status !== 'active') { lastH.delete(s.id); continue; }
      const prev = lastH.get(s.id);
      lastH.set(s.id, s.heading);
      if (prev === undefined) continue;
      const ratio = Math.abs(wrap(s.heading - prev)) / Math.max(1e-9, limitsOf(s, B.dt).rate);
      const u = turns.get(s.id) ?? { inFlight: 0, afterBreak: 0, breakAt: null, overall: 0 };
      u.overall = Math.max(u.overall, ratio);
      if (flightOf(B, s.id)) u.inFlight = Math.max(u.inFlight, ratio);
      else if (u.breakAt !== null && B.t - u.breakAt <= 60) u.afterBreak = Math.max(u.afterBreak, ratio);
      turns.set(s.id, u);
    }
  };

  // ── EXP-03 step 7: the same maneuver for a Helm 9 and a Helm 3 captain, on copies of the battle ────────────────
  const helmTest = (a: Record<string, unknown>) => {
    const ship = String(a.ship), name = String(a.name) as ManeuverName, target = (a.target as string | undefined) ?? null;
    const helms = (a.helms as number[] | undefined) ?? [9, 3];
    return helms.map((H) => {
      const c = JSON.parse(JSON.stringify(b())) as Battle;
      const s = c.ships.find((x) => x.id === ship)!;
      s.captain.abilities.helm = H;
      s.captain.trait = 'By-the-book'; // only Helm differs
      const pre = previewManeuver(c, [ship], name, target);
      const legs = plan(c, [ship], name, target).plans[0]?.legs ?? [];
      const course: XZ[] = [{ x: s.pos.x, z: s.pos.z }, ...legs.flatMap((l) => (l.k === 'go' ? [{ x: l.x, z: l.z }] : []))];
      const ghost = (pre.path[ship] ?? []).map((p) => ({ x: p.x, z: p.z }));
      const meanOff = ghost.reduce((m, p) => m + distToPath(p, course), 0) / Math.max(1, ghost.length);
      // Fly it on the copy: the battle runs on (guns and all) until the maneuver ends.
      simOrder(c, ship, { kind: 'maneuver', name, ...(target ? { target } : {}) }, s.side);
      const t0 = c.t;
      let done: number | null = null, flownOff = 0, n = 0, maxDev = 0;
      for (let k = 0; k < Math.round(MAN_MAX / c.dt) && done === null; k++) {
        simStep(c);
        const x = c.ships.find((y) => y.id === ship)!;
        if (!flightOf(c, ship)) { done = c.t - t0; break; }
        flownOff += distToPath({ x: x.pos.x, z: x.pos.z }, course); n++;
        maxDev = Math.max(maxDev, distToPath({ x: x.pos.x, z: x.pos.z }, ghost));
      }
      return { helm: H, previewEta: pre.eta, flownS: done === null ? null : Math.round(done * 10) / 10, meanOffCourseM: Math.round(meanOff), flownMeanOffCourseM: Math.round(flownOff / Math.max(1, n)), flownMaxFromGhostM: Math.round(maxDev) };
    });
  };
  const MAN_MAX = 600;

  // ── Probe ──────────────────────────────────────────────────────────────────────────────────────────────────────
  const snapshot = () => {
    const B = b();
    const st = picker.state();
    const arcs = shieldArcs(B, side(), intel);
    return {
      flag: flagOn('tactical'), on: open, timeScale: sim.timeScale, t: B.t, timeLog: [...timeLog],
      camera: { mode: rig.state.mode, pitch: rig.state.pitch, dist: Math.round(rig.state.dist) },
      exposure: view.renderer.toneMappingExposure,
      picker: {
        stage: st.stage, name: st.name, ships: st.ships, target: st.target,
        ghost: st.preview && { eta: st.preview.eta, complete: st.preview.complete, refused: st.preview.refused, points: Object.fromEntries(Object.entries(st.preview.path).map(([k, v]) => [k, v.length])), marks: st.preview.marks.length },
        last: st.last && { t: st.last.t, name: st.last.name, ships: st.last.ships, target: st.last.target, eta: st.last.preview.eta, ok: st.last.result.ok, reason: st.last.result.reason },
      },
      tracked: tracked.map((t) => ({ ship: t.ship, name: t.name, t0: t.t0, maxDevM: Math.round(t.maxDev * 10) / 10, samples: t.samples, end: t.end, withinTol: t.maxDev <= TAC.ghostTolM })),
      turns: Object.fromEntries([...turns].filter(([, u]) => u.inFlight > 0 || u.breakAt !== null).map(([k, u]) => [k, { inFlight: +u.inFlight.toFixed(3), afterBreak: +u.afterBreak.toFixed(3), breakAt: u.breakAt, overall: +u.overall.toFixed(3) }])),
      arcs: Object.fromEntries(Object.entries(arcs).map(([k, v]) => [k, Object.fromEntries(v.map((a) => [a.side, a.level === null ? a.state : `${a.state} ${Math.round(a.level * 100)}%`]))])),
      known: Object.fromEntries(Object.entries(intel.ships).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([f, x]) => [f, x.state]))])),
      maneuvers: MANEUVER_NAMES.map((n) => ({ name: n, label: MANEUVER_LABELS[n] })),
    };
  };
  const off = registerProbeSource('tactical', snapshot);

  const act = (verb: string, a: Record<string, unknown>) => {
    switch (verb) {
      case 'tactical': {
        if (!flagOn('tactical')) throw new Error('the tactical flag is off');
        setOpen(typeof a.on === 'boolean' ? a.on : !open);
        return { on: open, timeScale: sim.timeScale };
      }
      case 'tactical.maneuver': {
        const ships = (a.ships as string[] | undefined) ?? (comms?.snapshot().selected ? [comms.snapshot().selected!] : []);
        picker.choose(String(a.name) as ManeuverName, ships, (a.target as string | undefined) ?? null);
        return snapshot().picker;
      }
      case 'tactical.target': picker.target(String(a.ship)); return snapshot().picker;
      case 'tactical.ship': picker.toggleShip(String(a.ship)); return snapshot().picker;
      case 'tactical.commit': return commitAndSay();
      case 'tactical.reset': { const s0 = rig.state; if (open) { const k = saved; setOpen(false); setOpen(true); if (k) saved = k; } return { pitch: s0.pitch, yaw: s0.yaw, dist: s0.dist }; }
      case 'tactical.cancel': picker.cancel(); return snapshot().picker;
      case 'tactical.helm': return helmTest(a);
      default: throw new Error(`unknown tactical verb ${verb}`);
    }
  };

  return {
    enabled: () => flagOn('tactical'),
    on: () => open,
    toggle(on) { if (flagOn('tactical')) setOpen(on ?? !open); return { on: open, timeScale: sim.timeScale }; },
    resetView() {
      if (!open) return;
      // The tactical camera as T set it: close and open again keeps the camera he had before T to come back to.
      const keep = saved;
      setOpen(false);
      setOpen(true);
      if (keep) saved = keep;
    },
    step,
    reset() {
      setOpen(false);
      picker.reset();
      intel = createIntel();
      tracked = [];
      turns = new Map();
      lastH = new Map();
      seen = -1;
      replot = -1;
      timeLog.length = 0;
    },
    act,
    verbs: ['tactical', 'tactical.maneuver', 'tactical.target', 'tactical.ship', 'tactical.commit', 'tactical.cancel', 'tactical.helm', 'tactical.reset'],
    dispose() {
      off();
      window.removeEventListener('keydown', key);
      const i = view.afterRender.indexOf(draw);
      if (i >= 0) view.afterRender.splice(i, 1);
      if (comms && comms.maneuvers === hooks) comms.maneuvers = undefined;
      holo.dispose();
      window.clearTimeout(noticeTimer);
      svg.remove(); badge.remove(); panel.remove(); notice.remove(); tbtn.remove();
    },
  };
}
