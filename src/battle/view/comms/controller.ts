/**
 * The comms UI's controller (PKG-09, BRIDGE §4, §12; VISION §7a): selection, targeting, the keys, the order menu, the
 * flagship's crew, and the order lines drawn over the battle. Every order goes through PKG-06's `command()` (points,
 * pushback, refusals out loud), every answer through `answerTop()`, every Tab through `tabNext()`. Nothing here steers
 * a ship: the only thing the player changes is what the captains are told.
 *
 * The keys, the clicks and the probe (`act('answer' | 'tab' | 'select' | 'orderUI')`) all call the same methods.
 * React reads `snapshot()` through `subscribe()`; the snapshot is rebuilt only when `refresh()` bumps the version.
 */
import * as THREE from 'three';
import { registerProbeSource } from '../../../dev/probeSources';
import { answerTop, answerable, command, ping as simPing, POINTS, tabNext, watchShip } from '../../sim/index';
import type { Battle, CommandResult, OfficerId, Order, OrderKind, ShieldSide } from '../../sim/index';
import type { BattleView } from '../scene';
import type { SimFeed } from '../simFeed';
import { COMMS_UI } from './numbers';
import type { PickCandidate } from './pick';
import { pickNearest } from './pick';
import { flagOn } from '../../../flags';
import type { ManeuverHooks } from '../tactical/picker';
import type { PathCache } from '../tactical/paths';
import { pathD, projector } from '../tactical/overlay';
import type { MenuItem, OrderLine, QueueRow, RosterCard } from './logic';
import { allToSide, costOf, flagshipOf, menuFor, orderLines, playerFights, playerSide, queueRows, rosterOf, shiftSplit } from './logic';

/** The sound-cue hook (no audio asset yet): counts cues so the probe can see an urgent report was announced. */
export const cues: Record<string, number> = { urgent: 0 };
export function cue(kind: 'urgent'): void { cues[kind] = (cues[kind] ?? 0) + 1; }

/** What the order buttons and the probe's `orderUI` send. `ship` defaults to the selection (the flagship for crew). */
export interface OrderSpec {
  ship?: string;
  kind: OrderKind;
  target?: string;
  side?: ShieldSide;
  maneuver?: string;
  task?: string;
  /** shieldPower: a side to shift toward, 'even', or a side with all: true for everything to it. */
  shield?: ShieldSide | 'even';
  all?: boolean;
}

/** A crew order waiting for its target (guns on, pods): the next enemy clicked receives it. */
export interface Armed { kind: 'gunsOn' | 'launchPods'; officer: OfficerId }

export interface CommsSnapshot {
  t: number;
  ended: boolean;
  house: string;
  queue: QueueRow[];
  points: number;
  pointsMax: number;
  hoverCost: number | null;
  roster: RosterCard[];
  selected: string | null;
  selectedName: string | null;
  target: string | null;
  targetName: string | null;
  armed: Armed | null;
  menu: { x: number; y: number; ship: string; target: string; items: MenuItem[][] } | null;
  pingMenu: { x: number; y: number; ship: string } | null;
  notice: string | null;
  crew: {
    flagship: string | null; flagName: string; officers: Record<OfficerId, string>;
    guns: { mode: 'free' | 'on' | 'hold'; target: string | null; targetName: string | null };
    power: 'normal' | 'overload' | 'engines'; helm: string | null; fighters: string | null; pods: string | null;
    split: Record<ShieldSide, number> | null;
    fights: { target: string; name: string }[];
  } | null;
  answerable: number;
}

export interface CommsController {
  subscribe(fn: () => void): () => void;
  snapshot(): CommsSnapshot;
  /** The battle moved (the HUD tick, a probe advance): rebuild the snapshot and redraw the lines. */
  refresh(): void;
  /** A new battle (restart): clear selection, menus and timers. */
  reset(): void;
  /** Q/E/R: answer i on the card highlighted on screen (PKG-22, F-04), never on whatever the cursor reaches later. */
  answer(i: number): CommandResult;
  /** A click on an answer button: that card, that answer. */
  answerReport(id: number, i: number): CommandResult;
  /** Whether the key for answer i belongs to comms now. R (i = 2) does while any report waits (PKG-22 ruling, F-04). */
  canAnswer(i: number): boolean;
  tab(): number;
  select(ship: string | null): void;
  /** A click on the battle at client coordinates: pick a ship (raycast, then nearest on screen). */
  pickAt(x: number, y: number): string | null;
  /** An enemy chosen as the target (by click or probe): opens the order menu or fires an armed crew order. */
  targetShip(id: string, at?: { x: number; y: number }): CommandResult | null;
  order(spec: OrderSpec): CommandResult;
  arm(a: Armed | null): void;
  ping(ship: string): { reported: number; report: number } | null;
  openPing(ship: string, x: number, y: number): void;
  closeMenus(): void;
  hoverCost(cost: number | null): void;
  /** What `command()` will charge for this order on this ship. */
  costFor(ship: string | null, kind: OrderKind): number;
  /** Draws the order lines and the selection rings now (also on its own animation frame). */
  drawOverlay(): void;
  /** For the probe: the ship groups the scene exports, projected to client px. */
  screenOf(id: string): { x: number; y: number } | null;
  dispose(): void;
  /** PKG-12: the maneuver picker (set by the tactical view's mount; the order menu's Maneuver lines and clicks use it). */
  maneuvers?: ManeuverHooks;
}

const SVG = 'http://www.w3.org/2000/svg';
const CREW_KINDS: OrderKind[] = ['gunsOn', 'holdFire', 'overloadGuns', 'feedEngines', 'helm', 'launchPods', 'fighters'];

export function createCommsController(sim: SimFeed, view: BattleView, host: HTMLElement): CommsController {
  const b = (): Battle => sim.battle();
  const listeners = new Set<() => void>();
  const firstLeft = new Map<number, number>();
  const urgentSeen = new Set<number>();
  let version = 0;
  let built = -1;
  let snap: CommsSnapshot | null = null;
  let selected: string | null = null;
  let target: string | null = null;
  let armed: Armed | null = null;
  let menu: CommsSnapshot['menu'] = null;
  let pingMenu: CommsSnapshot['pingMenu'] = null;
  let notice: { text: string; at: number } | null = null;
  let hover: number | null = null;

  const bump = () => { version++; listeners.forEach((fn) => fn()); };
  const say = (text: string | null) => { if (text) notice = { text, at: performance.now() }; };
  const shipName = (id: string | null) => (id ? b().ships.find((s) => s.id === id)?.name ?? null : null);

  // ── Picking and projecting through the scene's exported ship lookup ─────────────────────────────────────────────
  const canvas = view.renderer.domElement;
  const groups = (): THREE.Object3D[] => (view.camera.userData.shipGroups as (() => THREE.Object3D[]) | undefined)?.() ?? [];
  const tmp = new THREE.Vector3();
  const project = (o: THREE.Object3D) => {
    const r = canvas.getBoundingClientRect();
    o.getWorldPosition(tmp).project(view.camera);
    if (tmp.z > 1 || tmp.z < -1) return null;
    return { x: r.left + ((tmp.x + 1) / 2) * r.width, y: r.top + ((1 - tmp.y) / 2) * r.height, lx: ((tmp.x + 1) / 2) * r.width, ly: ((1 - tmp.y) / 2) * r.height };
  };
  const ray = new THREE.Raycaster();
  /** PKG-17: every visible ship is a candidate by its projected centre; every hull under the ray (not only the first)
   * marks its ship as touched; pick.ts chooses by screen distance. Same rule in the normal and the tactical view. */
  const pickAt = (x: number, y: number): string | null => {
    const r = canvas.getBoundingClientRect();
    const gs = groups().filter((g) => g.visible);
    ray.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), view.camera);
    const depth = new Map<string, number>();
    for (const h of ray.intersectObjects(gs, true)) {
      if (!(h.object instanceof THREE.Mesh)) continue;
      let o: THREE.Object3D | null = h.object;
      while (o && o.userData.id === undefined) o = o.parent;
      if (o && !depth.has(o.userData.id as string)) depth.set(o.userData.id as string, h.distance);
    }
    const cands: PickCandidate[] = [];
    for (const g of gs) {
      const p = project(g);
      if (!p) continue;
      const id = g.userData.id as string;
      cands.push({ id, x: p.x, y: p.y, hit: depth.has(id), depth: depth.get(id) });
    }
    return pickNearest(cands, x, y);
  };
  // The hover ring: what a click here would pick, worked out once per frame from the last pointer position.
  let pointer: { x: number; y: number } | null = null;
  let pointerDirty = false;
  let hoverId: string | null = null;

  // ── The overlay: order lines (thin, house colour) and rings on the selection and the target ─────────────────────
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'cx-overlay');
  svg.setAttribute('aria-hidden', 'true');
  host.appendChild(svg);
  const paths: PathCache = new Map();
  let toPx = projector(view);
  const drawOverlay = () => {
    toPx = projector(view); // this frame's camera and battle frame
    const w = canvas.clientWidth, h = canvas.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.style.setProperty('--house', sim.frame().sides[0].colours.glow);
    const byId = new Map(groups().map((g) => [g.userData.id as string, g]));
    const at = (id: string | null) => { const g = id ? byId.get(id) : undefined; return g && g.visible ? project(g) : null; };
    const parts: string[] = [];
    const lines: OrderLine[] = orderLines(b(), flagOn('tactical'), paths);
    const yOf = (id: string) => sim.frame().ships.find((x) => x.id === id)?.pos[1] ?? 0;
    for (const l of lines) {
      const p = at(l.from);
      if (!p) continue;
      // PKG-12: a maneuver in progress is its remaining path; a hold station is a ring; a withdrawal points its course.
      if (l.path) {
        const y = yOf(l.from);
        const d = pathD(l.path.map((pt) => toPx.sim(pt, y)));
        if (d) parts.push(`<path class="cx-line cx-path" data-kind="${l.kind}" data-ship="${l.from}" d="${d}"/>`);
        continue;
      }
      const ps = l.point ? toPx.sim(l.point, yOf(l.from)) : null;
      const q = l.to ? at(l.to) : ps && { lx: ps.x, ly: ps.y };
      if (!q) continue;
      if (l.kind === 'holdPosition') { parts.push(`<circle class="cx-line" data-kind="${l.kind}" cx="${q.lx.toFixed(1)}" cy="${q.ly.toFixed(1)}" r="9" stroke-dasharray="3 3"/>`); continue; }
      const dash = l.kind === 'board' || l.kind === 'pods' ? ' stroke-dasharray="6 5"' : l.kind === 'focusSide' ? ' stroke-dasharray="2 4"'
        : l.kind === 'followFlagship' ? ' stroke-dasharray="9 4"' : l.kind === 'withdraw' ? ' stroke-dasharray="3 6"' : l.kind === 'gunsOn' ? ' stroke-dasharray="12 3 2 3"' : '';
      parts.push(`<line class="cx-line" data-kind="${l.kind}" x1="${p.lx.toFixed(1)}" y1="${p.ly.toFixed(1)}" x2="${q.lx.toFixed(1)}" y2="${q.ly.toFixed(1)}"${dash}/>`);
    }
    const ps = at(selected);
    if (ps) parts.push(`<circle class="cx-ring cx-ring-own" cx="${ps.lx.toFixed(1)}" cy="${ps.ly.toFixed(1)}" r="16"/>`);
    const pt = at(target);
    if (pt) parts.push(`<circle class="cx-ring cx-ring-target" cx="${pt.lx.toFixed(1)}" cy="${pt.ly.toFixed(1)}" r="16"/>`);
    // PKG-17: the hover ring shows which ship a click would pick (his own: house colour; the enemy's: danger).
    if (pointerDirty) { pointerDirty = false; hoverId = pointer ? pickAt(pointer.x, pointer.y) : null; canvas.style.cursor = hoverId ? 'pointer' : ''; }
    const ph = hoverId && hoverId !== selected && hoverId !== target ? at(hoverId) : null;
    if (ph) {
      const own = b().ships.find((x) => x.id === hoverId)?.side === playerSide(b());
      parts.push(`<circle class="cx-ring cx-ring-hover ${own ? 'cx-ring-own' : 'cx-ring-target'}" data-id="${hoverId}" cx="${ph.lx.toFixed(1)}" cy="${ph.ly.toFixed(1)}" r="${COMMS_UI.hoverRing}"/>`);
    }
    svg.innerHTML = parts.join('');
  };
  let raf = requestAnimationFrame(function loop() { raf = requestAnimationFrame(loop); drawOverlay(); });

  // ── Clicks on the battle: a press that did not travel is a pick, not an orbit ──────────────────────────────────
  let press: { x: number; y: number; id: number } | null = null;
  const down = (e: PointerEvent) => { if (e.button === 0) press = { x: e.clientX, y: e.clientY, id: e.pointerId }; };
  const up = (e: PointerEvent) => {
    const p = press;
    press = null;
    if (!p || p.id !== e.pointerId || Math.hypot(e.clientX - p.x, e.clientY - p.y) > COMMS_UI.clickSlop) return;
    const id = pickAt(e.clientX, e.clientY);
    if (!id) { menu = null; pingMenu = null; bump(); return; }
    const s = b().ships.find((x) => x.id === id);
    if (!s) return;
    if (ctl.maneuvers?.intercept(id, s.side === playerSide(b()))) return; // PKG-12: choosing a maneuver's ships or target
    if (s.side === playerSide(b())) ctl.select(id);
    else ctl.targetShip(id, { x: e.clientX, y: e.clientY });
  };
  // PKG-17: the hover ring follows the pointer (not while dragging the camera); recomputed on the next overlay frame.
  const hoverMove = (e: PointerEvent) => { if (e.buttons) return; pointer = { x: e.clientX, y: e.clientY }; pointerDirty = true; };
  const hoverOut = () => { pointer = null; pointerDirty = true; };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointermove', hoverMove);
  canvas.addEventListener('pointerleave', hoverOut);

  const toOrder = (spec: OrderSpec, ship: string): Order | null => {
    const o: Order = { kind: spec.kind };
    if (spec.target) o.target = spec.target;
    if (spec.side) o.side = spec.side;
    if (spec.maneuver) o.maneuver = spec.maneuver;
    if (spec.task) o.task = spec.task;
    if (spec.kind === 'shieldPower') {
      const s = b().ships.find((x) => x.id === ship);
      if (!s) return null;
      const k = spec.shield ?? 'even';
      o.split = k !== 'even' && spec.all ? allToSide(k) : shiftSplit(s.split, k);
    }
    return o;
  };

  const ctl: CommsController = {
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    snapshot() {
      if (snap && built === version) return snap;
      const B = b();
      if (notice && performance.now() - notice.at > COMMS_UI.noticeS * 1000) notice = null;
      const rows = queueRows(B, firstLeft);
      for (const r of rows) {
        if (r.level === 'urgent' && !urgentSeen.has(r.id)) { urgentSeen.add(r.id); cue('urgent'); }
      }
      const answers = rows.filter((r) => r.level !== 'status');
      const status = rows.filter((r) => r.level === 'status');
      const summary = status.filter((r) => r.type === 'summary');
      // PKG-22 (F-07): a capture card sits at the top of the status lines for as long as it is up.
      const rest = status.filter((r) => r.type !== 'summary')
        .sort((x, y) => Number(y.type === 'captured') - Number(x.type === 'captured')).slice(0, COMMS_UI.statusShown);
      const side = playerSide(B);
      const flag = flagshipOf(B);
      const crew = B.comms?.crew[side];
      if (selected && !B.ships.some((s) => s.id === selected && s.side === side)) selected = null;
      if (target && !B.ships.some((s) => s.id === target && s.side !== side && (s.status === 'active' || s.status === 'broken'))) target = null;
      snap = {
        t: B.t,
        ended: B.ended,
        house: sim.frame().sides[0].colours.glow,
        queue: [...answers, ...rest, ...summary],
        points: Math.floor((B.comms?.points[side] ?? 0) * 10) / 10,
        pointsMax: POINTS.max,
        hoverCost: hover,
        roster: rosterOf(B),
        selected,
        selectedName: shipName(selected),
        target,
        targetName: shipName(target),
        armed,
        menu,
        pingMenu,
        notice: notice?.text ?? null,
        crew: crew && flag ? {
          flagship: flag.status === 'active' ? flag.id : null,
          flagName: flag.name,
          officers: { ...B.comms!.officers, helm: flag.captain.name },
          guns: { ...crew.guns, targetName: B.ships.some((x) => x.id === crew.guns.target && x.side !== side) ? shipName(crew.guns.target) : null },
          power: crew.power, helm: crew.helm, fighters: crew.fighters, pods: crew.pods,
          split: { ...flag.split },
          fights: playerFights(B),
        } : null,
        answerable: answerable(B).length,
      };
      built = version;
      return snap;
    },
    refresh() { bump(); drawOverlay(); },
    reset() {
      selected = null; target = null; armed = null; menu = null; pingMenu = null; notice = null; hover = null;
      firstLeft.clear(); urgentSeen.clear();
      bump();
    },
    answer(i) {
      // The card the player is looking at: the highlighted row of the snapshot on screen (built at the last HUD tick).
      const shown = (snap ?? ctl.snapshot()).queue.find((q) => q.selected && q.level !== 'status')?.id;
      return ctl.answerReport(shown ?? -1, i);
    },
    answerReport(id, i) {
      const r = answerTop(b(), i, id < 0 ? undefined : id);
      if (!r.ok) say(r.reason);
      hover = null;
      bump();
      return r;
    },
    canAnswer(i) {
      const list = answerable(b());
      if (!list.length) return false;
      if (i === 2) return true;
      const shown = (snap ?? ctl.snapshot()).queue.find((q) => q.selected && q.level !== 'status');
      const r = list.find((x) => x.id === shown?.id) ?? list[0];
      return !!r.answers[i];
    },
    tab() { const n = tabNext(b()); bump(); return n; },
    select(ship) {
      const s = ship ? b().ships.find((x) => x.id === ship) : undefined;
      selected = s && s.side === playerSide(b()) ? (selected === s.id && ship !== null ? null : s.id) : null;
      menu = null; pingMenu = null;
      bump();
    },
    pickAt,
    targetShip(id, atPx) {
      const B = b();
      const s = B.ships.find((x) => x.id === id);
      if (!s || s.side === playerSide(B)) return null;
      target = id;
      watchShip(B, id); // PKG-22 (F-03): the master of guns watches the ship the admiral picked out
      pingMenu = null;
      if (armed) {
        const a = armed;
        armed = null;
        menu = null;
        return ctl.order({ kind: a.kind, target: id });
      }
      if (selected) {
        const p = atPx ?? ctl.screenOf(id) ?? { x: 200, y: 200 };
        menu = { x: p.x, y: p.y, ship: selected, target: id, items: menuFor(B, selected, id) };
      }
      bump();
      return null;
    },
    order(spec) {
      const B = b();
      const crewKind = CREW_KINDS.includes(spec.kind);
      const ship = spec.ship ?? (crewKind || (spec.kind === 'shieldPower' && !selected) ? flagshipOf(B)?.id : selected) ?? null;
      menu = null;
      if (!ship) { const r = { ok: false, reason: 'Select a ship first.', protest: null }; say(r.reason); bump(); return r; }
      const o = toOrder(spec, ship);
      if (!o) { const r = { ok: false, reason: 'That ship is not under your command.', protest: null }; say(r.reason); bump(); return r; }
      const r = command(B, ship, o);
      if (!r.ok) say(r.reason);
      hover = null;
      bump();
      return r;
    },
    arm(a) {
      // A target already chosen takes the order at once; otherwise the next enemy clicked does.
      if (a && target) { armed = null; ctl.order({ kind: a.kind, target }); return; }
      armed = a; menu = null;
      bump();
    },
    ping(ship) {
      pingMenu = null;
      const r = simPing(b(), ship);
      if (!r) say('No answer from that ship.');
      bump();
      return r;
    },
    openPing(ship, x, y) { pingMenu = { ship, x, y }; menu = null; bump(); },
    closeMenus() { menu = null; pingMenu = null; armed = null; bump(); },
    costFor(ship, kind) {
      const crewKind = CREW_KINDS.includes(kind);
      return costOf(b(), ship ?? (crewKind ? flagshipOf(b())?.id ?? null : selected), kind);
    },
    hoverCost(c) { if (hover !== c) { hover = c; bump(); } },
    drawOverlay,
    screenOf(id) {
      const g = groups().find((x) => x.userData.id === id);
      const p = g ? project(g) : null;
      return p ? { x: p.x, y: p.y } : null;
    },
    dispose() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointermove', hoverMove);
      canvas.removeEventListener('pointerleave', hoverOut);
      svg.remove();
      offProbe();
      listeners.clear();
    },
  };

  /** The probe's view of the comms UI: what is on the panel, the points, the selection and the lines. */
  const offProbe = registerProbeSource('comms', () => {
    const s = ctl.snapshot();
    return {
      queue: s.queue.map((q) => ({ id: q.id, level: q.level, type: q.type, from: q.from.name, ship: q.from.ship, text: q.text, answers: q.answers, keys: q.keys, secondsLeft: q.secondsLeft, selected: q.selected })),
      points: s.points, selected: s.selected, target: s.target, armed: s.armed, menu: s.menu && { ship: s.menu.ship, target: s.menu.target, items: s.menu.items.flat().map((m) => m.id) },
      roster: s.roster.map((r) => ({ id: r.id, name: r.name, word: r.word, reported: r.reported, mood: r.mood, prize: r.prize })),
      lines: orderLines(b(), flagOn('tactical'), paths).map((l) => (l.path ? { ...l, path: l.path.length } : l)), cues: { ...cues }, notice: s.notice, crew: s.crew,
      /** Each ship's projected centre in client px (null off screen): where a real click lands on it. */
      screen: Object.fromEntries(b().ships.map((x) => [x.id, ctl.screenOf(x.id)])),
      /** PKG-17: the ship under the hover ring (what a click at the pointer would pick), or null. */
      hover: hoverId,
    };
  });

  return ctl;
}

