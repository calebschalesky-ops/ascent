/**
 * The placeholder battle the view was built on, kept behind `?stub` for comparison only (simFeed.ts is the default):
 * two lines of twelve under the engine's two houses (SATURN_12V12), steering on parallel courses, closing to a stand-off
 * range and trading fire. Nobody is damaged; nothing here is a rule of the game.
 *
 * Positions are in the battle frame: origin at the battle's centre, +y the normal of Saturn's ring plane.
 */
import { peopleOf } from '../../lib/races';
import { SATURN_12V12 } from '../sim/index';
import type { NationId } from '../../lib/nations';
import type { BattleEvent, BattleFeed, BattleFrame, ShipView, ShotView, Side, SideInfo, V3 } from './model';

/** Every tunable number of the stub, in one place. First-pass, placeholder only (not balance: the stub deals no damage). */
export const STUB = {
  shipsPerSide: 12,
  /** Which slot in each line is the capital ship. */
  capitalSlot: 5,
  /** Gap between ships in a line, battle units. */
  spacing: 14,
  /** Gap between the two lines at the start, and the stand-off gap they hold once closed. */
  startGap: 240,
  holdGap: 80,
  /** Each line closes at this speed until the hold gap. */
  closeSpeed: 3.5,
  /** Both lines steam along +x at this speed. */
  cruiseSpeed: 2,
  /** Lines open fire when the gap is under this. */
  fireRange: 200,
  /** Seconds between one ship's shots: min, max. */
  fireInterval: [1.1, 2.8] as [number, number],
  shotSpeed: 170,
  hitChance: 0.6,
  /** How far a miss lands from its target. */
  missScatter: 9,
  /** Out-of-line stagger, so a line looks crewed rather than ruled. */
  stagger: { y: 3, z: 2.5 },
  bob: { amp: 0.8, period: 9 },
};

const SIDES: [NationId, NationId] = ['saturn', 'jupiter'];

/** mulberry32: the stub's own seeded random, so a seed always gives the same battle. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sideInfo(side: Side): SideInfo {
  const house = SIDES[side];
  const p = peopleOf(house);
  // The HUD names the engine's houses, not the peoples: the stub must not show a battle the engine does not fight.
  const name = side === 0 ? SATURN_12V12.player.house : SATURN_12V12.enemy.house;
  return { side, house, name, colours: { hull: p.palette.hull, accent: p.palette.accent, glow: p.palette.glow } };
}

interface Slot { ship: ShipView; dy: number; dz: number; phase: number; nextFire: number }

export function createStubFeed(seed0 = 1): BattleFeed {
  let t = 0;
  let seed = seed0;
  let rand = rng(seed);
  let gap = STUB.startGap;
  let drift = 0;
  let slots: Slot[] = [];
  let shots: ShotView[] = [];
  let events: BattleEvent[] = [];
  const opened: [boolean, boolean] = [false, false];
  const sides: [SideInfo, SideInfo] = [sideInfo(0), sideInfo(1)];

  const place = () => {
    const closing = gap > STUB.holdGap;
    for (const s of slots) {
      const { side } = s.ship;
      const i = Number(s.ship.id.split('-')[1]);
      const sign = side === 0 ? 1 : -1;
      const bob = STUB.bob.amp * Math.sin((t / STUB.bob.period) * Math.PI * 2 + s.phase);
      s.ship.pos = [(i - (STUB.shipsPerSide - 1) / 2) * STUB.spacing + drift, s.dy + bob, sign * (gap / 2) + s.dz];
      const vx = STUB.cruiseSpeed;
      const vz = closing ? -sign * STUB.closeSpeed : 0;
      const n = Math.hypot(vx, vz);
      s.ship.heading = [vx / n, 0, vz / n];
    }
  };

  const frame = (): BattleFrame => ({ t, seed, sides, ships: slots.map((s) => s.ship), shots, events });

  const reset = (n: number) => {
    seed = n;
    rand = rng(seed);
    t = 0;
    gap = STUB.startGap;
    drift = 0;
    shots = [];
    events = [];
    opened[0] = opened[1] = false;
    slots = [];
    for (const side of [0, 1] as Side[]) {
      for (let i = 0; i < STUB.shipsPerSide; i++) {
        const info = sides[side];
        slots.push({
          ship: {
            id: `${side === 0 ? 'S' : 'J'}-${i}`, side, house: info.house, cls: i === STUB.capitalSlot ? 'capital' : 'cruiser',
            pos: [0, 0, 0], heading: [1, 0, 0], status: 'alive', colours: info.colours,
          },
          dy: (rand() * 2 - 1) * STUB.stagger.y,
          dz: (rand() * 2 - 1) * STUB.stagger.z,
          phase: rand() * Math.PI * 2,
          nextFire: STUB.fireInterval[0] + rand() * (STUB.fireInterval[1] - STUB.fireInterval[0]),
        });
      }
    }
    place();
    return frame();
  };

  const step = (dt: number) => {
    shots = [];
    events = [];
    t += dt;
    drift += STUB.cruiseSpeed * dt;
    if (gap > STUB.holdGap) gap = Math.max(STUB.holdGap, gap - 2 * STUB.closeSpeed * dt);
    place();
    if (gap < STUB.fireRange) {
      for (const s of slots) {
        if (s.ship.status !== 'alive') continue;
        s.nextFire -= dt;
        if (s.nextFire > 0) continue;
        s.nextFire = STUB.fireInterval[0] + rand() * (STUB.fireInterval[1] - STUB.fireInterval[0]);
        const foes = slots.filter((o) => o.ship.side !== s.ship.side && o.ship.status === 'alive');
        if (!foes.length) continue;
        const i = Number(s.ship.id.split('-')[1]);
        const pick = Math.max(0, Math.min(foes.length - 1, i + Math.round((rand() * 2 - 1) * 2)));
        const target = foes[pick].ship;
        const hit = rand() < STUB.hitChance;
        const miss = (): number => (rand() * 2 - 1) * STUB.missScatter;
        const to: V3 = hit ? [...target.pos] : [target.pos[0] + miss(), target.pos[1] + miss(), target.pos[2] + miss()];
        const from: V3 = [...s.ship.pos];
        const flight = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) / STUB.shotSpeed;
        shots.push({ shooter: s.ship.id, target: target.id, side: s.ship.side, kind: s.ship.cls === 'capital' ? 'rail' : 'gun', from, to, flight, hit });
        if (!opened[s.ship.side]) {
          opened[s.ship.side] = true;
          events.push({ t, kind: 'open-fire', ship: s.ship.id, text: `${sides[s.ship.side].name} open fire` });
        }
      }
    }
    return frame();
  };

  reset(seed0);
  return { name: 'stub', timeScale: 1, reset, step, frame };
}
