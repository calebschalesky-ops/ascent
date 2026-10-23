import { describe, expect, it } from 'vitest';
import { setFlag } from '../../../flags';
import { hashState } from '../../sim/index';
import type { CameraRig } from '../camera';
import { cameraCommands, createCameraRig } from '../camera';
import type { ShipCls } from '../model';
import { createSimFeed } from '../simFeed';
import { createDirector } from './director';
import { DIRECTOR } from './numbers';

const DT = 1 / 30;
/** scene.ts LOOK.length (kept here so the test does not load three.js). */
const LENGTHS: Record<ShipCls, number> = { capital: 20, destroyer: 9.5, cruiser: 7, carrier: 13, escort: 4.5, fighter: 2 };

function rigWithDirector(seed: number, visible?: () => boolean) {
  const feed = createSimFeed(seed);
  const rig: CameraRig = createCameraRig();
  const d = createDirector({ lengths: LENGTHS, visible });
  rig.onTake = () => d.take(rig);
  d.reset(rig);
  const cmd = cameraCommands(rig);
  const run = (seconds: number, each?: () => void) => {
    for (let i = 0, n = Math.round(seconds / DT); i < n; i++) {
      const f = feed.step(DT);
      d.step(f, feed.battle(), rig, DT);
      each?.();
    }
  };
  return { feed, rig, d, cmd, run };
}

describe('director (PKG-11)', { timeout: 60_000 }, () => {
  setFlag('director', true);

  it('EXP-04 1-2: films seed 4 by itself, wide then closer on named events', () => {
    const { d, run } = rigWithDirector(4);
    run(60);
    const s = d.snapshot();
    expect(s.mode).toBe('director');
    expect(s.shots).toBeGreaterThanOrEqual(3);
    expect(s.byKind.wide).toBeGreaterThanOrEqual(1);
    expect(s.byKind.close + s.byKind.medium).toBeGreaterThanOrEqual(2);
    for (const shot of s.log.filter((x) => x.kind !== 'wide')) {
      expect(shot.subject).toBeTruthy();
      expect(shot.reason.length).toBeGreaterThan(3);
    }
  });

  it('EXP-04 3-4: gives way on the input frame, takes back after the idle, with a slow move', () => {
    const { rig, d, cmd, run } = rigWithDirector(4);
    run(20);
    const before = d.snapshot().shots;
    cmd.camera({ yaw: 0.3 });
    expect(rig.state.mode).toBe('player'); // the same frame, before any step
    const held = { yaw: rig.state.yaw, pitch: rig.state.pitch, dist: rig.state.dist };
    run(DIRECTOR.handBack - 0.2);
    expect(rig.state.mode).toBe('player');
    expect({ yaw: rig.state.yaw, pitch: rig.state.pitch, dist: rig.state.dist }).toEqual(held); // the director never moved it
    expect(d.snapshot().shots).toBe(before);
    for (let k = 0; k < 30 && rig.state.mode === 'player'; k++) run(DT);
    const s = d.snapshot();
    expect(rig.state.mode).toBe('director');
    expect(s.modeLog[1].t - s.modeLog[0].t).toBeCloseTo(DIRECTOR.handBack, 0);
    expect(s.modeLog.map((m) => m.mode)).toEqual(['player', 'director']);
    expect(s.shot?.transition).toBe('move');
    // A slow move: one step after the hand-back the camera is still within a few per cent of where he left it.
    expect(Math.abs(rig.state.dist - held.dist) / held.dist).toBeLessThan(0.1);
  });

  it('EXP-04 5: a big moment while he holds the camera opens an inset and leaves his camera alone', () => {
    const { rig, d, cmd, run, feed } = rigWithDirector(4, () => false);
    run(5);
    cmd.camera({ zoom: 0.8 });
    let last = { yaw: rig.state.yaw, pitch: rig.state.pitch, dist: rig.state.dist };
    let moved = false;
    // Hold the camera (a touch every 5 s) until the battle ends.
    for (let k = 0; k < 200 && !feed.frame().outcome; k++) {
      run(5, () => { if (rig.state.yaw !== last.yaw || rig.state.pitch !== last.pitch || rig.state.dist !== last.dist) moved = true; });
      cmd.camera({ yaw: 0.01 });
      last = { yaw: rig.state.yaw, pitch: rig.state.pitch, dist: rig.state.dist };
    }
    const s = d.snapshot();
    expect(moved).toBe(false);
    expect(s.modeLog.every((m) => m.mode === 'player')).toBe(true);
    expect(s.pipLog.length).toBeGreaterThanOrEqual(1);
    expect(s.pipLog.every((p) => ['captured', 'flagshipLost', 'breach', 'wrecked', 'struck'].includes(p.kind))).toBe(true);
  }, 30_000);

  it('EXP-04 6: the look never changes the result (seed 4, director on and player camera vs no camera at all)', () => {
    const { feed, cmd, run } = rigWithDirector(4);
    let i = 0;
    run(15 * 60, () => { if (++i % 400 === 0) cmd.camera({ yaw: 0.2, zoom: 0.9 }); });
    const bare = createSimFeed(4);
    for (let n = 0; n < Math.round((15 * 60) / DT); n++) bare.step(DT);
    expect(feed.battle().ended).toBe(true);
    expect(hashState(feed.battle())).toBe(hashState(bare.battle()));
  }, 60_000);

  it('WORLD-01 7: seed 1 idle, at least one shot per 20 s for the whole battle', () => {
    const { d, run, feed } = rigWithDirector(1);
    for (let k = 0; k < 900 && !feed.frame().outcome; k++) run(1);
    const s = d.snapshot();
    expect(s.shotsPer20s).toBeGreaterThanOrEqual(1);
    expect(s.maxGap).toBeLessThanOrEqual(20);
  }, 30_000);

  it('does nothing with the flag off', () => {
    setFlag('director', false);
    const { rig, d, run } = rigWithDirector(4);
    const yaw = rig.state.yaw;
    run(30);
    expect(d.snapshot().shots).toBe(0);
    expect(rig.state.yaw).toBe(yaw);
    setFlag('director', true);
  });
});
