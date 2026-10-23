/**
 * Drill boarders in the scene: launched from capital ships, flying, shot at by point defence and the player's lasers,
 * drilling in, the fight inside, and the ship changing side. The rules are lib/boarding/; this file moves and draws
 * them and lands the results on combat's ships. DRILL-BOARDER.md is the design.
 */
import * as THREE from 'three';
import type { DestGeo, V3 } from '../lib/nav';
import { add, closest, cross, dist, len, scale, sub, unit } from '../lib/nav';
import type { NationId } from '../lib/nations';
import { NATIONS } from '../lib/nations';
import type { Fit } from '../lib/progression/catalog';
import { raceRef } from '../lib/progression/refs';
import { sweptHit } from '../lib/weapons';
import { SHIP_SPECS } from '../lib/shipTypes';
import type { Boarder, Hull, LossCause } from '../lib/boarding/boarder';
import { breachDamage, crewOf, impact, launch, pdDps, pointDefence, stepDrill, stepFlight } from '../lib/boarding/boarder';
import type { ClearShot, Launcher } from '../lib/boarding/enemy';
import { ENEMY_COOLDOWN, enemyLaunch, pickLauncher } from '../lib/boarding/enemy';
import type { Prize } from '../lib/boarding/prize';
import { escortSlot, escortStep, samePrize } from '../lib/boarding/prize';
import { BAY, BOARDER, NATION_BOARDING } from '../lib/boarding/spec';
import type { HullFight, TroopForce } from '../lib/boarding/troops';
import { HULL_FIGHT } from '../lib/boarding/troops';
import type { Combat, Craft } from './combat';
import { createBoarderKit } from './space/boarder';
import { SHIP_MODEL_LENGTH } from './space/ship';

export interface BoardingOpts {
  shipScale: number;
  playerNation: NationId;
  /** Prizes from the save: those hulls leave their patrols and escort the player. */
  prizes: Prize[];
  /** Called with the whole list whenever a prize is taken, lost or destroyed (save it). */
  onPrizes: (p: Prize[]) => void;
  /** The player's side took a ship (progression pays it like a kill). */
  onCapture: (c: Craft) => void;
  notify: (line: string) => void;
  bodies: DestGeo[];
}

type Flying = Boarder & { obj: THREE.Group; spark: THREE.Sprite | null };
interface Fight { fight: HullFight; side: 0 | 1; nation: NationId; boarders: Flying[]; fx: THREE.Sprite[] }
interface Puff { t: number; life: number; sprite: THREE.Sprite; size: number }

export const shipName = (c: Pick<Craft, 'nation' | 'type'>) => `${raceRef(c.nation).demonym} ${raceRef(c.nation).ships[c.type]}`;

function glowTex(color: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createBoarding(combat: Combat, opts: BoardingOpts) {
  const L = SHIP_MODEL_LENGTH * opts.shipScale;
  const group = new THREE.Group();
  combat.root.add(group);
  const kit = createBoarderKit();
  const textures: THREE.Texture[] = [];
  const sparkTex = glowTex('rgba(255,190,90,1)');
  const fightTex = glowTex('rgba(255,120,60,1)');
  textures.push(sparkTex, fightTex);
  const beaconMats = new Map<string, THREE.SpriteMaterial>();
  const tintMats = new Map<string, THREE.SpriteMaterial>();
  const colorOf = (n: NationId) => NATIONS.find((x) => x.id === n)!.color;
  const tint = (color: string) => {
    let m = tintMats.get(color);
    if (!m) { const t = glowTex(color); textures.push(t); m = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); tintMats.set(color, m); }
    return m;
  };

  const boarders: Flying[] = [];
  const fights = new Map<number, Fight>();
  const puffs: Puff[] = [];
  const bays = new Map<number, number>();
  const cooldowns = new Map<number, number>();
  /** Who defends a ship when it is not its own crew (a prize's crew is the boarders who took it). */
  const crews = new Map<number, TroopForce>();
  let prizes: Prize[] = [];
  const escorts: Craft[] = [];
  const stats = { launched: 0, enemyLaunched: 0, shot: 0, deflected: 0, fuel: 0, drilled: 0, captured: 0, repelled: 0, lostToEnemy: 0, recaptured: 0 };
  let nextId = 1;
  let t = 0;
  let lastPos: V3 | null = null;

  const side = (c: Craft): 0 | 1 => (c.hostile ? 1 : 0);
  // Integration pass 2: hit points are arsenal's defences (hull + shield facets) and fits are enemy-ai's rolls.
  const hpOf = (c: Craft) => c.def.hull + c.def.shield.reduce((a, x) => a + x, 0);
  const pdFit = (c: Craft): Fit => ({ weapon: c.fit.weapons.filter((w) => w === 'flak'), defence: [], support: c.fit.drones.includes('pointDefence') ? ['dronePD'] : [] });
  const hullOf = (c: Craft): Hull => ({
    id: c.id, type: c.type, nation: c.nation, side: side(c), pos: c.pos, vel: c.vel, radius: c.radius,
    skin: SHIP_SPECS[c.type].size * L * 0.22, // on the plating, not the hit sphere: hulls are long and narrow
    hp: hpOf(c), maxHp: c.maxHp, alive: c.alive,
  });
  const shieldOf = (c: Craft) => (c.def.maxShield > 0 ? c.def.shield.reduce((a, x) => a + x, 0) / (c.def.maxShield * c.def.shield.length) : 0);
  const hull01 = (c: Craft) => c.def.hull / Math.max(1e-9, c.def.maxHull);
  const bayOf = (c: Craft) => { if (!bays.has(c.id)) bays.set(c.id, BAY[c.type]); return bays.get(c.id)!; };
  const byId = (id: number) => combat.crafts.find((c) => c.id === id);
  const clear: ClearShot = (from, to) => !opts.bodies.some((b) => b.size > 0 && closest(from, to, b.pos).d < b.size);

  /** A ship's beacon turns a side's colour. */
  function recolor(c: Craft, color: string) {
    let m = beaconMats.get(color);
    if (!m) { const tx = glowTex(color); textures.push(tx); m = new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false }); beaconMats.set(color, m); }
    for (const o of c.obj.children) if (o instanceof THREE.Sprite) o.material = m;
  }

  function puff(at: V3, color: string, size: number, life = 0.7) {
    const sprite = new THREE.Sprite(tint(color));
    sprite.position.set(...at);
    group.add(sprite);
    puffs.push({ t: 0, life, sprite: sprite, size });
  }

  // ---- The player's side: its capital ship (stand-in escort) and its prizes ----
  /**
   * STAND-IN until fleet-command merges: the player nation's own capital ship keeps station behind the player, so it
   * can launch. With fleet-command, its flagship is a driven craft of the player's side; delete this.
   */
  const flagship = combat.crafts.find((c) => c.type === 'capital' && c.nation === opts.playerNation && !c.hostile && c.alive) ?? null;
  if (flagship) { flagship.driven = true; escorts.push(flagship); }

  function makePrize(c: Craft, crew: TroopForce) {
    c.hostile = false;
    c.driven = true;
    crews.set(c.id, crew);
    recolor(c, colorOf(opts.playerNation));
    if (!escorts.includes(c)) escorts.push(c);
  }
  const record = (c: Craft): Prize => {
    const crew = crews.get(c.id) ?? { strength: 0, quality: 1 };
    return { nation: c.nation, type: c.type, idx: c.idx, hp: c.def.hull, maxHp: c.maxHp, crew: crew.strength, quality: crew.quality, at: Date.now() };
  };
  const savePrizes = () => { prizes = escorts.filter((c) => c !== flagship && c.alive).map(record); opts.onPrizes(prizes); };

  for (const p of opts.prizes) {
    const c = combat.crafts.find((x) => x.alive && samePrize(p, x));
    if (!c) continue;
    c.def.hull = Math.min(c.def.maxHull, p.hp); // a prize saves its hull (shields come back full)
    // Placed behind the player on the first frame (escortStep jumps the gap).
    makePrize(c, { strength: p.crew, quality: p.quality });
  }
  prizes = escorts.filter((c) => c !== flagship).map(record);

  // ---- Launch ----
  function spawn(from: Craft, target: Craft) {
    const b = launch(nextId++, hullOf(from), hullOf(target), L) as Flying;
    b.obj = kit.make(from.nation, BOARDER.size * L);
    b.spark = null;
    group.add(b.obj);
    boarders.push(b);
    bays.set(from.id, bayOf(from) - 1);
    return b;
  }

  /** The player's T: board the ship under the held lock (or the one given), from the nearest capital ship in range. */
  function board(targetId?: number): Flying | null {
    const lk = combat.lock;
    const target = targetId !== undefined ? byId(targetId) : lk && lk.locked ? lk.craft : undefined;
    if (!target || !target.alive || !target.hostile) { opts.notify('Lock a cruiser or capital ship to board it'); return null; }
    const launchers: Launcher[] = combat.crafts.filter((c) => c.alive && !c.hostile).map((c) => ({ hull: hullOf(c), bay: bayOf(c), cooldown: 0 }));
    const pick = pickLauncher(launchers, hullOf(target), L, clear);
    if (!pick.launcher) { opts.notify(pick.why); return null; }
    const from = byId(pick.launcher.hull.id)!;
    const b = spawn(from, target);
    stats.launched++;
    opts.notify(`${NATION_BOARDING[from.nation].name} away → ${shipName(target)} · ${bayOf(from)} left`);
    return b;
  }

  function lose(b: Flying, cause: LossCause) {
    b.phase = 'lost';
    b.lost = cause;
    group.remove(b.obj);
    if (b.spark) group.remove(b.spark);
    const i = boarders.indexOf(b);
    if (i >= 0) boarders.splice(i, 1);
  }

  function endFight(targetId: number) {
    const f = fights.get(targetId);
    if (!f) return;
    for (const b of f.boarders) lose(b, f.fight.outcome === 'captured' ? 'target' : 'repelled');
    for (const s of f.fx) group.remove(s);
    fights.delete(targetId);
  }

  function capture(c: Craft, f: Fight) {
    const crew = { strength: f.fight.attackers.strength, quality: f.fight.attackers.quality };
    const name = shipName(c);
    if (f.side === 0) {
      makePrize(c, crew);
      stats.captured++;
      endFight(c.id);
      savePrizes();
      opts.onCapture(c);
      puff(c.pos, colorOf(opts.playerNation), 6 * c.radius, 1.2);
      opts.notify(`Captured ${name}: ${Math.round(crew.strength)} ${NATION_BOARDING[f.nation].troopName} hold her`);
    } else {
      // An enemy boarding took one of the player's ships: it goes over and lies adrift until boarded back.
      const wasPrize = c !== flagship;
      c.hostile = true;
      c.vel = [0, 0, 0];
      crews.set(c.id, crew);
      const i = escorts.indexOf(c);
      if (i >= 0) escorts.splice(i, 1);
      recolor(c, colorOf(f.nation));
      stats.lostToEnemy++;
      endFight(c.id);
      if (wasPrize) savePrizes();
      puff(c.pos, colorOf(f.nation), 6 * c.radius, 1.2);
      opts.notify(`${raceRef(f.nation).race} boarders took ${name}`);
    }
  }

  const up0: V3 = [0, 1, 0];
  const committed = (targetId: number, s: 0 | 1): TroopForce | undefined => {
    let strength = 0;
    let q = 0;
    for (const b of boarders) if (b.target === targetId && b.side === s && b.phase !== 'lost') { strength += b.troops.strength; q += b.troops.strength * b.troops.quality; }
    const f = fights.get(targetId);
    if (f && f.side === s) { strength += f.fight.attackers.strength; q += f.fight.attackers.strength * f.fight.attackers.quality; }
    return strength > 0 ? { strength, quality: q / strength } : undefined;
  };

  function update(dt: number, pos: V3, fwd: V3) {
    t += dt;
    // ---- Escorts: the flagship stand-in and the prizes keep station behind the player ----
    const f = unit(fwd);
    let right = cross(f, up0);
    right = len(right) > 1e-6 ? unit(right) : [1, 0, 0];
    const up = cross(right, f);
    // The player's velocity, measured (an orbit moves the ship without its velocity), so escorts keep up.
    const carry: V3 = lastPos && dt > 0 && dist(pos, lastPos) < 400 * L ? scale(sub(pos, lastPos), 1 / dt) : [0, 0, 0];
    lastPos = [...pos];
    let slot = 0;
    for (const c of escorts) {
      if (!c.alive) continue;
      const goal = escortSlot(c === flagship ? 0 : ++slot, c.type, pos, f, right, up, L);
      const s = escortStep(c.pos, goal, dt, L, carry);
      c.pos = s.pos;
      c.vel = s.vel;
      c.fwd = f;
    }
    // A prize destroyed: off the list.
    if (escorts.some((c) => !c.alive && c !== flagship)) {
      for (let i = escorts.length - 1; i >= 0; i--) if (!escorts[i].alive && escorts[i] !== flagship) escorts.splice(i, 1);
      savePrizes();
    }

    // ---- Enemy capital ships board the player's ships whose shields are down ----
    const mine = combat.crafts.filter((c) => c.alive && !c.hostile && (c.type === 'cruiser' || c.type === 'capital'));
    for (const c of combat.crafts) {
      if (!c.alive || !c.hostile || c.type !== 'capital') continue;
      const cd = Math.max(0, (cooldowns.get(c.id) ?? 0) - dt);
      cooldowns.set(c.id, cd);
      if (!mine.length) continue;
      const id = enemyLaunch({
        launcher: { hull: hullOf(c), bay: bayOf(c), cooldown: cd },
        targets: mine.map((m) => ({ hull: hullOf(m), shield: shieldOf(m), hull01: hull01(m), defenders: crews.get(m.id) })),
        committed: new Map(mine.map((m) => [m.id, committed(m.id, 1)]).filter((e): e is [number, TroopForce] => !!e[1])),
        L, clear,
      });
      if (id === null) continue;
      const target = byId(id)!;
      spawn(c, target);
      cooldowns.set(c.id, ENEMY_COOLDOWN);
      stats.enemyLaunched++;
      opts.notify(`Incoming: a ${NATION_BOARDING[c.nation].name} boarder from the ${shipName(c)} → your ${shipName(target)}`);
    }

    // ---- Point defence: every warship fires at the other side's boarders in range ----
    const pdShips = combat.crafts
      .filter((c) => c.alive && c.type !== 'fighter')
      .map((c) => ({ hull: hullOf(c), dps: pdDps(c.type, pdFit(c), hull01(c)) }));
    const pd = pointDefence(pdShips, boarders, dt, L);
    // ---- The player's lasers hit enemy boarders ----
    const shots = combat.arsenal.shots; // every munition the player fires (arsenal)
    for (let i = shots.length - 1; i >= 0; i--) {
      const bolt = shots[i];
      if (bolt.hostile) continue;
      const from = sub(bolt.pos, scale(bolt.vel, dt));
      const hit = boarders.find((b) => b.side === 1 && b.phase === 'flying' && sweptHit(from, bolt.pos, b.pos, bolt.m.radius + BOARDER.hitRadius * L * 0.5));
      if (!hit) continue;
      pd.set(hit.id, (pd.get(hit.id) ?? 0) + bolt.m.damage);
      bolt.obj.parent?.remove(bolt.obj);
      shots.splice(i, 1);
    }
    for (const b of [...boarders]) {
      const d = pd.get(b.id);
      if (!d || b.phase !== 'flying') continue;
      b.hp -= d;
      if (b.hp > 0) continue;
      stats.shot++;
      puff(b.pos, '#ffaa55', 4 * BOARDER.size * L * 6, 0.6);
      if (b.side === 0) opts.notify(`${NATION_BOARDING[b.nation].name} shot down by point defence`);
      lose(b, 'shot');
    }

    // ---- Flight, impact, drill ----
    for (const b of [...boarders]) {
      const target = byId(b.target);
      if (!target || !target.alive || side(target) === b.side) {
        // The target died, or changed side before it struck (someone else took it).
        if (b.phase === 'flying' || b.phase === 'drilling') lose(b, 'target');
        continue;
      }
      if (b.phase === 'flying') {
        const r = stepFlight(b, hullOf(target), dt, L);
        if (r === 'fuel') { stats.fuel++; lose(b, 'fuel'); continue; }
        if (r === 'hit') {
          if (impact(b, shieldOf(target)) === 'deflected') {
            stats.deflected++;
            puff(b.pos, '#9fd8ff', 3 * L, 0.5);
            if (b.side === 0) opts.notify(`Deflected: ${shipName(target)}'s shield is up. Strip it first`);
            lose(b, 'deflected');
            continue;
          }
          b.spark = new THREE.Sprite(tint('#ffbe5a'));
          group.add(b.spark);
          if (b.side === 0) opts.notify(`${NATION_BOARDING[b.nation].name} drilling into ${shipName(target)}`);
        }
      }
      if (b.phase === 'drilling' || b.phase === 'inside') {
        b.pos = add(target.pos, b.contact ?? [0, 0, 0]);
      }
      if (b.phase === 'drilling') {
        if (b.spark) { b.spark.position.set(...b.pos); b.spark.scale.setScalar(L * (0.6 + Math.random() * 0.8)); }
        if (stepDrill(b, dt)) {
          stats.drilled++;
          if (b.spark) { group.remove(b.spark); b.spark = null; }
          combat.damage(target, breachDamage(target.maxHp), b.side === 0 ? 'player' : 'wing');
          if (!target.alive) { lose(b, 'target'); continue; }
          const fx = fights.get(target.id);
          if (fx && fx.side === b.side) { HULL_FIGHT.reinforce(fx.fight, b.troops); fx.boarders.push(b); }
          else {
            if (fx) endFight(target.id);
            const def = crews.get(target.id) ?? crewOf(target.type, target.nation, hull01(target));
            const sprites = [0, 1, 2].map(() => { const s = new THREE.Sprite(tint('#ff7a3c')); group.add(s); return s; });
            fights.set(target.id, { fight: HULL_FIGHT.start(b.troops, def), side: b.side, nation: b.nation, boarders: [b], fx: sprites });
          }
          const fl = fights.get(target.id)!.fight;
          if (b.side === 0 || !target.hostile) opts.notify(`${Math.round(fl.attackers.strength)} ${NATION_BOARDING[b.nation].troopName} inside ${shipName(target)} against ${Math.round(fl.defenders.strength)}`);
        }
      }
      if (b.phase === 'flying') {
        const v = len(b.vel) > 1e-9 ? b.vel : [0, 0, -1] as V3;
        b.obj.position.set(...b.pos);
        b.obj.lookAt(b.pos[0] - v[0], b.pos[1] - v[1], b.pos[2] - v[2]);
      } else {
        // Clamped on, nose into the hull.
        b.obj.position.set(...b.pos);
        const out = add(b.pos, sub(b.pos, target.pos));
        b.obj.lookAt(out[0], out[1], out[2]);
      }
      b.obj.traverse((o) => { if (o.userData.drill && b.phase === 'drilling') o.rotation.y += dt * 25; });
    }

    // ---- The fights inside ----
    for (const [id, fx] of [...fights]) {
      const c = byId(id);
      if (!c || !c.alive) { endFight(id); continue; }
      HULL_FIGHT.step(fx.fight, dt);
      for (const s of fx.fx) {
        const on = Math.random() < 0.35;
        s.visible = on;
        if (on) { s.position.set(...add(c.pos, scale(unit([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]), c.radius * 0.5 * Math.random()))); s.scale.setScalar(L * (0.3 + Math.random() * 0.6)); }
      }
      if (fx.fight.outcome === 'captured') capture(c, fx);
      else if (fx.fight.outcome === 'repelled') {
        stats.repelled++;
        if (fx.side === 0) opts.notify(`Boarding repelled: ${shipName(c)}'s crew held`);
        else { stats.recaptured++; opts.notify(`Your crew threw the boarders off ${shipName(c)}`); }
        // The defenders who are left are the ship's crew now.
        crews.set(id, { ...fx.fight.defenders });
        endFight(id);
      }
    }

    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.t += dt;
      const k = p.t / p.life;
      p.sprite.scale.setScalar(p.size * (0.3 + k * 1.4));
      p.sprite.material.opacity = Math.max(0, 1 - k);
      if (k >= 1) { group.remove(p.sprite); puffs.splice(i, 1); }
    }
  }

  return {
    update,
    board,
    key: (k: string) => { if (k === 't') { board(); return true; } return false; },
    get boarders() { return boarders; },
    fights,
    get prizes() { return prizes; },
    escorts,
    flagship,
    bays,
    stats,
    /** Dev: what a ship would bring to a boarding, for the proofs. */
    look: (id: number) => { const c = byId(id); return c ? { name: shipName(c), hostile: c.hostile, hp: hpOf(c), maxHp: c.maxHp, shield: +shieldOf(c).toFixed(3), hull: +hull01(c).toFixed(3), crew: crews.get(c.id) ?? crewOf(c.type, c.nation, hull01(c)), pos: c.pos.map((v) => +v.toFixed(2)) } : null; },
    dist: (a: number, b: number) => { const x = byId(a); const y = byId(b); return x && y ? dist(x.pos, y.pos) / L : null; },
    L,
    dispose: () => {
      combat.root.remove(group);
      kit.dispose();
      textures.forEach((x) => x.dispose());
      beaconMats.forEach((m) => m.dispose());
      tintMats.forEach((m) => m.dispose());
    },
  };
}

export type Boarding = ReturnType<typeof createBoarding>;
