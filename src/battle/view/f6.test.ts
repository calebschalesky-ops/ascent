/**
 * F6 for the battle view (PKG-15, HOUSE-RULES 3): every colour and every typeface in `src/battle/view/**` comes from
 * the shared tokens (`src/styles.css` :root), never a raw value. A raw hex colour (`#rgb`, `#rrggbb`, `#rrggbbaa`, or a
 * six-digit `0x` literal in code), an `rgb()`/`hsl()` literal in a stylesheet, or a `font-family` (or `font:` shorthand,
 * or `fontFamily`) naming a face instead of `var(--…)` fails it.
 *
 * Exempt: art files with their own colours, each with its reason. Add a file here only when it draws art (the 3D scene,
 * a painted placeholder); an interface file never is.
 */
import { describe, expect, it } from 'vitest';

/** Every stylesheet and source file under src/battle/view/, as text, keyed by its path from here. Read from disk with
 * node's fs (vitest runs in node): a `?raw` glob would hand back stylesheets empty under vitest's CSS handling. The
 * module name is built at run time so the browser-typed project needs no node types. */
type Entry = { name: string; isDirectory(): boolean };
const fs = (await import(/* @vite-ignore */ ['node', 'fs'].join(':'))) as {
  readdirSync(p: URL, o: { withFileTypes: true }): Entry[];
  readFileSync(p: URL, e: 'utf8'): string;
};
function walk(dir: URL, rel = ''): [string, string][] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e): [string, string][] =>
    e.isDirectory() ? walk(new URL(`${e.name}/`, dir), `${rel}${e.name}/`)
      : /\.(css|tsx?)$/.test(e.name) ? [[`${rel}${e.name}`, fs.readFileSync(new URL(e.name, dir), 'utf8')]] : []);
}
const SOURCES: Record<string, string> = Object.fromEntries(walk(new URL('./', import.meta.url)));

export const EXEMPT: Record<string, string> = {
  'scene.ts': '3D scene art: hit and wreck fire colours, the earth house hull, the clear colour, white for instanced tint',
  'body.ts': 'PKG-20 planet art: Europa and Titan surface colours, copied from moonScene.ts LOOK for the shared surface shader',
};

/** Comments out, so a colour named in prose is not a colour used. Strings stay (a colour in a string is used). */
function stripComments(src: string, css: boolean): string {
  const block = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  return css ? block : block.replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, pre: string) => pre + ' '.repeat(m.length - pre.length));
}

export interface F6Hit { file: string; line: number; text: string; why: string }

/** Scan one file's source. `name` decides CSS or code rules by its extension. */
export function scanF6(name: string, src: string): F6Hit[] {
  const css = name.endsWith('.css');
  const lines = stripComments(src, css).split('\n');
  const hits: F6Hit[] = [];
  const hex = /(^|[^\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w-])/;
  const hex0x = /\b0x[0-9a-fA-F]{6}\b/;
  const fn = /\b(?:rgba?|hsla?)\s*\(/;
  const family = css ? /font-family\s*:\s*([^;}]*)/ : /(?:fontFamily\s*:|font-family\s*:)\s*([^,;}\n]*)/;
  const shorthand = /(?:^|[\s;{])font\s*:\s*([^;}]*)/;
  const tokenOnly = (v: string) => v.replace(/var\(--[\w-]+\)/g, '').replace(/['"`]/g, '').trim() === '';
  lines.forEach((text, i) => {
    const add = (why: string) => hits.push({ file: name, line: i + 1, text: text.trim(), why });
    if (hex.test(text)) add('raw hex colour');
    if (!css && hex0x.test(text)) add('raw 0x colour');
    if (css && fn.test(text)) add('raw rgb()/hsl() colour');
    const f = family.exec(text);
    if (f && !tokenOnly(f[1])) add('font-family outside the tokens');
    if (css) {
      const s = shorthand.exec(text);
      if (s && (/['"]/.test(s[1]) || /\b(?:serif|sans-serif|monospace|system-ui|cursive|fantasy)\b/.test(s[1].replace(/var\(--[\w-]+\)/g, '')))) add('font shorthand names a face');
    }
  });
  return hits;
}

describe('F6: the battle view uses the shared tokens', () => {
  it('no raw colour or typeface in src/battle/view/** outside the exempt art files', () => {
    expect(SOURCES['skirmish.css']).toContain('.skirmish');
    expect(SOURCES['comms/comms.css']).toContain('.cx-queue');
    const hits = Object.entries(SOURCES)
      .filter(([rel]) => !(rel in EXEMPT))
      .flatMap(([rel, src]) => scanF6(rel, src));
    expect(hits.map((h) => `${h.file}:${h.line} ${h.why}: ${h.text}`)).toEqual([]);
  });

  it('every exempt file exists and says why', () => {
    for (const [rel, why] of Object.entries(EXEMPT)) {
      expect(rel in SOURCES).toBe(true);
      expect(why.length).toBeGreaterThan(10);
    }
  });

  // The planted values are built from parts, so this file never holds one itself.
  const H = '#';
  const FF = 'font-' + 'family';
  const FFC = 'font' + 'Family';
  it('catches a planted raw colour or face, and passes the token forms', () => {
    expect(scanF6('x.css', `.a { color: ${H}ff8a1e; }`)).toHaveLength(1);
    expect(scanF6('x.css', `.a { background: ${H}fff; }`)).toHaveLength(1);
    expect(scanF6('x.css', `.a { color: rgba(1, 2, 3, .5); }`)).toHaveLength(1);
    expect(scanF6('x.css', `.a { ${FF}: Georgia, serif; }`)).toHaveLength(1);
    expect(scanF6('x.css', `.a { font: 600 14px 'IM Fell English'; }`)).toHaveLength(1);
    expect(scanF6('x.tsx', `const s = { color: '${H}3f7fd0' };`)).toHaveLength(1);
    expect(scanF6('x.tsx', `const s = { ${FFC}: 'Arial' };`)).toHaveLength(1);
    expect(scanF6('x.ts', `new THREE.Color(0x${'ff8a1e'});`)).toHaveLength(1);
    expect(scanF6('x.css', `.a { color: var(--hud); font: 600 12px/16px var(--body); ${FF}: var(--display); }`)).toEqual([]);
    expect(scanF6('x.css', `/* ${H}090c1a in a comment */ .a { color: var(--hud); }`)).toEqual([]);
    expect(scanF6('x.ts', `const seed = 0x6d2b79f5; // ${H}fff in a comment`)).toEqual([]);
    expect(scanF6('x.css', `.a { color: color-mix(in srgb, var(--house) 24%, var(--glass)); }`)).toEqual([]);
  });
});
