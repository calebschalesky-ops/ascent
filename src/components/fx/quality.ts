/**
 * The graphics setting, as the effects read it. Voyage sets `fxQuality.high` every frame from Settings → Graphics
 * (High / Battery saver); effects check it when they spawn or draw, so switching takes effect at once.
 */
export const fxQuality = {
  high: true,
  /** Particle budget multiplier: High 1, Battery saver about a third. */
  get budget() { return this.high ? 1 : 0.35; },
};

const mobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
export const isMobile = mobile;
