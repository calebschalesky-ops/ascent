import { describe, expect, it } from 'vitest';
import { NATIONS } from './nations';
import { AVATAR_OPTIONS } from './opening/profile';
import { HEIGHT_M, RACE_ART, aDemonym, pilotArt, pilotSex } from './raceArt';
import { PEOPLES } from './races';

// Node only, loaded at run time: the app's tsconfig carries no node types (as in balance.test.ts).
type Node = {
  existsSync: (p: string) => boolean;
  fileURLToPath: (u: URL) => string;
  sharp: (p: string) => { metadata: () => Promise<{ format?: string; width?: number; height?: number }> };
};
const node = async (): Promise<Node> => {
  const [fs, url, sh] = ['node:fs', 'node:url', 'sharp'];
  const { existsSync } = await import(/* @vite-ignore */ fs);
  const { fileURLToPath } = await import(/* @vite-ignore */ url);
  const sharp = (await import(/* @vite-ignore */ sh)).default;
  return { existsSync, fileURLToPath, sharp };
};

describe('race art', () => {
  it('every nation has a head and a body, and every people has art', () => {
    for (const n of NATIONS) {
      const a = RACE_ART[n.id];
      expect(a, n.id).toBeDefined();
      expect(a.head.src).toBe(`races/${n.id}/head.webp`);
      expect(a.body.src).toBe(`races/${n.id}/body.webp`);
    }
    for (const p of PEOPLES) expect(RACE_ART[p.nation], p.nation).toBeDefined();
  });

  it('every path exists on disk, at the size the table gives', async () => {
    const { existsSync, fileURLToPath, sharp } = await node();
    const pub = (src: string) => fileURLToPath(new URL(`../../public/${src}`, import.meta.url));
    for (const [n, a] of Object.entries(RACE_ART)) {
      for (const im of [a.head, a.body, ...(a.leader ? [a.leader] : [])]) {
        const file = pub(im.src);
        expect(existsSync(file), `${n}: ${im.src}`).toBe(true);
        const m = await sharp(file).metadata();
        // The table gives the display size. A sheet crop is stored at that size; a painted head (GEMINI-PROMPTS.md) at
        // a whole multiple of it, for sharp screens, and is still shown no larger than the table says.
        const k = Math.round((m.width ?? 0) / im.w);
        expect([m.format, k >= 1, m.width, m.height], `${n}: ${im.src}`).toEqual(['webp', true, im.w * k, im.h * k]);
      }
    }
  });

  it('crops are never bigger than the 1024 × 572 sheets they come from', () => {
    for (const a of Object.values(RACE_ART)) for (const im of [a.head, a.body, ...(a.leader ? [a.leader] : [])]) {
      expect(im.w).toBeLessThanOrEqual(1024);
      expect(im.h).toBeLessThanOrEqual(572);
    }
  });

  it('heights follow the Decisions list: Nephelai smallest, Diadochoi tallest, Humans at 1.75 m', () => {
    const order = Object.entries(HEIGHT_M).sort((x, y) => x[1] - y[1]).map(([n]) => n);
    expect(order).toEqual(['venus', 'earth', 'mercury', 'mars', 'saturn', 'moon', 'jupiter']);
    expect(HEIGHT_M.earth).toBe(1.75);
    expect(HEIGHT_M.venus).toBe(1.5);
    expect(HEIGHT_M.jupiter).toBe(2.4);
  });

  it('every offered given name has a face of the right sex, and a typed name always gets the same face', () => {
    for (const n of NATIONS) for (const g of AVATAR_OPTIONS[n.id].given) expect(['f', 'm'], g).toContain(pilotSex(g));
    expect(pilotSex('Amara Okafor')).toBe('f');
    expect(pilotSex('Gaius Corvus')).toBe('m');
    expect(pilotSex('Hypatia of the Archive')).toBe('f');
    expect(pilotSex('Zed Quill')).toBe(pilotSex('Zed Other'));
    expect(pilotArt('earth', 'Amara Okafor').src).toBe('races/earth/pilot-f.webp');
    expect(pilotArt('mars', 'Livia Varro').src).toBe('races/mars/pilot-f.webp');
    expect(pilotArt('moon', 'Meton').src).toBe('races/moon/pilot-m.webp');
  });

  it('captions take the right article', () => {
    expect(aDemonym('Human')).toBe('A Human');
    expect(aDemonym('Autochthon')).toBe('An Autochthon');
  });
});
