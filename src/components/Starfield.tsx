import { useEffect, useRef } from 'react';

/** A quiet starfield behind everything. Still when reduced motion is on or the page is hidden. */
export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stars: { x: number; y: number; r: number; p: number; s: number }[] = [];
    let raf = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((innerWidth * innerHeight) / 2600);
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      stars = Array.from({ length: n }, () => ({
        x: rnd() * innerWidth, y: rnd() * innerHeight,
        r: rnd() < 0.08 ? 1.3 : 0.4 + rnd() * 0.6,
        p: rnd() * Math.PI * 2, s: 0.3 + rnd() * 0.9,
      }));
      draw(0);
    }
    function draw(t: number) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const st of stars) {
        const tw = reduce ? 0.75 : 0.55 + 0.45 * Math.sin(st.p + (t / 1000) * st.s);
        ctx.globalAlpha = tw * (st.r > 1 ? 0.95 : 0.7);
        ctx.fillStyle = st.r > 1 ? '#fff4d6' : '#cfd6ff';
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    function loop(t: number) {
      draw(t);
      raf = requestAnimationFrame(loop);
    }
    resize();
    addEventListener('resize', resize);
    if (!reduce) raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="starfield" aria-hidden="true" />;
}
