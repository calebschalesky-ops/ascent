/**
 * PKG-21 F-12: "Guns on…" and "Pods at…" wait for an enemy click. While one waits, a banner over the battle says so
 * and the cursor is a crosshair; a click that lands on no ship says it missed (the order stays armed); Esc stands it
 * down (Skirmish.tsx's key handler calls the controller's `closeMenus`). Draws from the comms controller's snapshot and
 * its `pickAt`, the same picking the click itself uses.
 */
import type { CommsController } from '../comms/controller';
import type { BattleView } from '../scene';
import './input.css';

/** How long the miss line stays, ms; how far a press may travel and still be a click, px. First-pass. */
export const ARMED_UI = { missMs: 2200, clickSlop: 6 };

export function mountArmed(o: { host: HTMLElement; view: BattleView; comms: CommsController }): { dispose(): void } {
  const { host, view, comms } = o;
  const canvas = view.renderer.domElement;
  const banner = document.createElement('div');
  banner.className = 'in-armed';
  banner.setAttribute('role', 'status');
  banner.hidden = true;
  const miss = document.createElement('div');
  miss.className = 'in-miss';
  miss.setAttribute('role', 'status');
  miss.hidden = true;
  host.append(banner, miss);
  let missTimer = 0;
  let shown = '';

  const sync = () => {
    const a = comms.snapshot().armed;
    const text = a ? `${a.kind === 'gunsOn' ? 'Guns on…' : 'Pods at…'} click an enemy ship · Esc stands down` : '';
    if (text !== shown) { shown = text; banner.textContent = text; }
    banner.hidden = !a;
    canvas.classList.toggle('in-aiming', !!a);
    if (!a) { miss.hidden = true; }
  };
  const unsub = comms.subscribe(sync);
  sync();

  let press: { x: number; y: number; id: number } | null = null;
  const down = (e: PointerEvent) => { if (e.button === 0) press = { x: e.clientX, y: e.clientY, id: e.pointerId }; };
  const up = (e: PointerEvent) => {
    const p = press;
    press = null;
    if (!p || p.id !== e.pointerId || Math.hypot(e.clientX - p.x, e.clientY - p.y) > ARMED_UI.clickSlop) return;
    const a = comms.snapshot().armed;
    if (!a || comms.pickAt(e.clientX, e.clientY)) return;
    const r = host.getBoundingClientRect();
    miss.textContent = 'Missed: no ship there. Click on an enemy ship.';
    miss.style.left = `${Math.round(e.clientX - r.left)}px`;
    miss.style.top = `${Math.round(e.clientY - r.top)}px`;
    miss.hidden = false;
    window.clearTimeout(missTimer);
    missTimer = window.setTimeout(() => { miss.hidden = true; }, ARMED_UI.missMs);
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointerup', up);

  return {
    dispose() {
      unsub();
      window.clearTimeout(missTimer);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
      canvas.classList.remove('in-aiming');
      banner.remove();
      miss.remove();
    },
  };
}
