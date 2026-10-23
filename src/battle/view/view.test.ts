import { describe, expect, it } from 'vitest';
import { FLAGS, flagOn, setFlag } from '../../flags';
import { probeDriver, probeSourceNames, readProbeSource, registerProbeDriver, registerProbeSource } from '../../dev/probeSources';
import { CAM, cameraCommands, createCameraRig } from './camera';
import { STUB, createStubFeed } from './stubFeed';
import { SATURN_12V12, createBattle, hashState, step, summarise } from '../sim/index';
import { createSimFeed } from './simFeed';

describe('stub feed (model.ts boundary)', () => {
  it('starts with two lines of twelve, one capital each, in the two houses', () => {
    const f = createStubFeed(1).frame();
    expect(f.ships).toHaveLength(24);
    expect(f.ships.filter((s) => s.side === 0)).toHaveLength(12);
    expect(f.ships.filter((s) => s.side === 1)).toHaveLength(12);
    expect(f.ships.filter((s) => s.cls === 'capital')).toHaveLength(2);
    expect(f.sides.map((s) => s.house)).toEqual(['saturn', 'jupiter']);
    expect(f.sides.map((s) => s.name)).toEqual([SATURN_12V12.player.house, SATURN_12V12.enemy.house]);
    expect(new Set(f.ships.map((s) => s.id)).size).toBe(24);
  });

  it('closes the lines, fires both ways, and holds at the stand-off gap', () => {
    const feed = createStubFeed(1);
    const z0 = feed.frame().ships.map((s) => s.pos[2]);
    const fired = [0, 0];
    for (let i = 0; i < 60 * 30; i++) for (const s of feed.step(1 / 30).shots) fired[s.side]++;
    const end = feed.frame();
    expect(end.t).toBeCloseTo(60, 6);
    end.ships.forEach((s, i) => expect(Math.abs(s.pos[2])).toBeLessThan(Math.abs(z0[i])));
    const gap = Math.abs(end.ships[0].pos[2] - end.ships[12].pos[2]);
    expect(gap).toBeGreaterThan(STUB.holdGap - 2 * STUB.stagger.z - 2 * STUB.bob.amp);
    expect(gap).toBeLessThan(STUB.holdGap + 2 * STUB.stagger.z + 2 * STUB.bob.amp);
    expect(fired[0]).toBeGreaterThan(0);
    expect(fired[1]).toBeGreaterThan(0);
    for (const s of end.ships) for (const x of [...s.pos, ...s.heading]) expect(Number.isFinite(x)).toBe(true);
  });

  it('is the same battle for the same seed and a different one for another', () => {
    const run = (seed: number) => {
      const feed = createStubFeed(seed);
      const shots: string[] = [];
      for (let i = 0; i < 600; i++) for (const s of feed.step(1 / 30).shots) shots.push(`${s.shooter}>${s.target}:${s.hit}`);
      return JSON.stringify([feed.frame().ships.map((s) => s.pos), shots]);
    };
    expect(run(7)).toBe(run(7));
    expect(run(7)).not.toBe(run(8));
    const feed = createStubFeed(3);
    const a = JSON.stringify(feed.frame());
    feed.step(1);
    expect(JSON.stringify(feed.reset(3))).toBe(a);
  });
});

describe('camera command layer', () => {
  it('hands the camera to the player on the command, and clamps', () => {
    const rig = createCameraRig();
    const cmd = cameraCommands(rig);
    expect(rig.state.mode).toBe('director');
    cmd['camera.orbit']({ yaw: 0.5, pitch: 10 });
    expect(rig.state.mode).toBe('player');
    expect(rig.state.pitch).toBe(CAM.maxPitch);
    cmd['camera.zoom']({ factor: 1e-6 });
    expect(rig.state.dist).toBe(CAM.minDist);
    cmd['camera.reset']({});
    expect([rig.state.yaw, rig.state.pitch, rig.state.dist]).toEqual([CAM.yaw, CAM.pitch, CAM.dist]);
    const d = Math.hypot(...rig.state.eye.map((e, i) => e - rig.state.target[i]));
    expect(d).toBeCloseTo(CAM.dist, 6);
  });
});

describe('flags and probe registry', () => {
  it('ships skirmish on (PKG-21: the title-screen entry), and a flag can be flipped for the page', () => {
    expect(FLAGS.find((f) => f.name === 'skirmish')?.on).toBe(true);
    expect(setFlag('skirmish', false)).toBe(true);
    expect(flagOn('skirmish')).toBe(false);
    setFlag('skirmish', true);
    expect(setFlag('no-such-flag', true)).toBe(false);
  });

  it('registers and unregisters sources and the driver', () => {
    const off = registerProbeSource('t-src', () => ({ n: 1 }));
    expect(probeSourceNames()).toContain('t-src');
    expect(readProbeSource('t-src')).toEqual({ n: 1 });
    off();
    expect(probeSourceNames()).not.toContain('t-src');
    const d = { name: 't', seed: () => 0, advance: () => ({ t: 0, steps: 0, frames: 1 }), act: () => null, verbs: () => [] };
    const offD = registerProbeDriver(d);
    expect(probeDriver()).toBe(d);
    offD();
    expect(probeDriver()).toBeNull();
  });
});

describe('sim feed (the real engine through model.ts)', { timeout: 60_000 }, () => {
  it('starts 12 v 12 in the engine houses; only his own ships show open shield sides', () => {
    const f = createSimFeed(1).frame();
    expect(f.ships.filter((s) => s.side === 0)).toHaveLength(12);
    expect(f.ships.filter((s) => s.side === 1)).toHaveLength(12);
    expect(f.sides.map((s) => s.name)).toEqual([SATURN_12V12.player.house, SATURN_12V12.enemy.house]);
    expect(f.sides.map((s) => s.house)).toEqual(['saturn', 'jupiter']);
    expect(f.ships.filter((s) => s.flagship).map((s) => s.cls)).toEqual(['capital', 'capital']);
    for (const s of f.ships) expect(s.open !== undefined).toBe(s.side === 0);
    expect(JSON.stringify(f)).not.toMatch(/morale/);
  });

  it('is the headless battle, step for step, and never changes it on its own', () => {
    const feed = createSimFeed(4);
    const b = createBattle(SATURN_12V12, 4);
    for (let i = 0; i < 900; i++) { feed.step(1 / 30); step(b); }
    expect(hashState(feed.battle())).toBe(hashState(b));
    expect(feed.frame().t).toBeCloseTo(30, 6);
  });

  it('moves both fleets and fires both ways, with hits landing on a named shield side', () => {
    const feed = createSimFeed(1);
    const p0 = feed.frame().ships.map((s) => [...s.pos]);
    const fired = [0, 0];
    let faced = 0;
    for (let i = 0; i < 60 * 30; i++) {
      for (const s of feed.step(1 / 30).shots) {
        fired[s.side]++;
        if (s.hit) { expect(['fore', 'aft', 'port', 'starboard']).toContain(s.face); faced++; }
        for (const x of [...s.from, ...s.to, s.flight]) expect(Number.isFinite(x)).toBe(true);
      }
    }
    expect(fired[0]).toBeGreaterThan(0);
    expect(fired[1]).toBeGreaterThan(0);
    expect(faced).toBeGreaterThan(0);
    // Both fleets move. Not every ship: an escort keeping station on a slow flagship, or a carrier already at its
    // preferred range, can sit still for the first minute (measured on seed 1: 3 of 24).
    const moved = [0, 0];
    feed.frame().ships.forEach((s, i) => { if (Math.hypot(s.pos[0] - p0[i][0], s.pos[2] - p0[i][2]) > 1) moved[s.side]++; });
    expect(moved[0]).toBeGreaterThan(6);
    expect(moved[1]).toBeGreaterThan(6);
  });

  it('ends with an outcome, a reason and each side\'s tally from summarise()', () => {
    const feed = createSimFeed(1);
    let f = feed.frame();
    const said: string[] = [];
    for (let i = 0; i < 15 * 60 * 30 + 30 && !f.outcome; i++) { f = feed.step(1 / 30); said.push(...f.events.map((e) => e.text)); }
    expect(f.outcome).toBeDefined();
    const o = f.outcome!;
    const sum = summarise(feed.battle());
    expect(o.kind).toBe(sum.outcome);
    expect(o.reason).toBeTruthy();
    expect(o.text).toBe(sum.winner === 'player' ? 'Victory' : sum.winner === 'enemy' ? 'Defeat' : 'Drawn');
    expect(o.tally![0]).toEqual({ lost: sum.sides.player.shipsLost, broken: sum.sides.player.broken, struck: sum.sides.player.struck, fled: sum.sides.player.fled + sum.sides.player.withdrawn, captured: sum.sides.player.captured });
    expect(o.tally![1].lost).toBe(sum.sides.enemy.shipsLost);
    expect(said.some((t) => /runs/.test(t))).toBe(true);
    for (const t of said) expect(t).not.toMatch(/morale|Nerve/);
    const statuses = new Set(f.ships.map((s) => s.status));
    expect([...statuses].every((s) => ['alive', 'broken', 'fled', 'withdrawn', 'struck', 'wrecked'].includes(s))).toBe(true);
  });

  it('takes orders for his own side only, through order()', () => {
    const feed = createSimFeed(6);
    const flag = feed.battle().sides.player.flagshipId;
    const foe = feed.battle().sides.enemy.flagshipId;
    expect(feed.order(flag, { kind: 'attack', target: foe })).toBe(true);
    expect(feed.order(foe, { kind: 'holdPosition' })).toBe(false);
    const f = feed.step(1 / 30);
    expect(f.events.map((e) => e.text).join('|')).toMatch(/aye, engaging/);
    expect(feed.battle().ships.find((s) => s.id === flag)!.order).toEqual({ kind: 'attack', target: foe });
  });

  it('restarts on a seed to the same opening frame', () => {
    const feed = createSimFeed(2);
    const a = JSON.stringify(feed.frame());
    feed.step(5);
    expect(JSON.stringify(feed.reset(2))).toBe(a);
    expect(feed.timeScale).toBe(1);
  });
});
