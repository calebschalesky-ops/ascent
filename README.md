# Ascent Flight (working title)

A space flight game on The Ascent's flight engine, with the astrology taken out. Vite + React + TypeScript + three.js.

```
npm install
npm run dev -- --port 5293 --strictPort
npx vitest run
npm run build
```

What it is and what was removed: [SPEC.md](SPEC.md). What was done and proved: [THREAD-LOG.md](THREAD-LOG.md).
In development, `window.__voyage` drives the flight by hand (`run(seconds)`, `actions`, `enter(dest)`, `snap()`,
`combat`, `firing`, `setWeapon`).
