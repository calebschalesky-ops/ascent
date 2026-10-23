/**
 * Hit feel (mc-controls, R12): a short tick when your shot lands, and the numbers for the hitmarker, the hurt flash
 * and the camera kick. Kept subtle; the low graphics setting drops the camera kick.
 */
export const FEEL = {
  hitmark: 0.12, // seconds the hitmarker shows on the crosshair
  tickGap: 0.06, // seconds between two ticks at most (a beam lands every frame)
  hurt: 0.35, // seconds the red edge takes to fade
  kick: 0.05, // camera kick on a hit, in ship lengths (×SHIP_LENGTH in the scene)
  kickDecay: 14, // 1/s
} as const;

let ctx: AudioContext | null = null;
let last = 0;

/** A short, quiet tick (the browser only allows sound after a click or key press; before that it stays silent). */
export function hitTick(now: number, volume = 0.05) {
  if (now - last < FEEL.tickGap) return;
  last = now;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1900, t);
    o.frequency.exponentialRampToValueAtTime(1200, t + 0.04);
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.06);
  } catch { /* no sound is fine */ }
}
