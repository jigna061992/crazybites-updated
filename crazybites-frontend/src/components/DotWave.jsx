// src/components/DotWave.jsx
// Background for the whole project: tiny twinkling particles (stars) + a very faint cyan spiral.
// Kept deliberately very faint so that text/tables stay clearly readable.
import { useEffect, useRef } from "react";

const STAR_COLORS = [[255, 255, 255], [140, 225, 255], [180, 160, 255]];
const ARM_POINTS = 700;   // dots in the spiral
const ARMS = 2;

export default function DotWave() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1, raf = 0, stars = [], arm = [];

    const rand = (a, b) => a + Math.random() * (b - a);

    const build = () => {
      const n = Math.min(420, Math.round((w * h) / 3600));
      stars = Array.from({ length: n }, () => ({
        x: rand(0, w), y: rand(0, h),
        r: rand(0.5, 1.7),
        vx: rand(-0.05, 0.05), vy: rand(-0.04, 0.02),
        ph: rand(0, 6.28), sp: rand(0.4, 1.6),
        base: rand(0.45, 1),
        c: STAR_COLORS[(Math.random() * STAR_COLORS.length) | 0],
      }));
      arm = Array.from({ length: ARM_POINTS * ARMS }, (_, i) => {
        const a = i % ARMS;
        const t = Math.floor(i / ARMS) / ARM_POINTS;          // 0..1 along spiral
        return { a, t, j: rand(-1, 1), j2: rand(-1, 1), r: rand(0.7, 1.7) };
      });
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const draw = (now) => {
      const t = now * 0.001;
      ctx.clearRect(0, 0, w, h);

      // --- faint spiral (bottom right corner) ---
      const cx = w * 0.84, cy = h * 0.8, R = Math.min(w, h) * 0.6;
      for (const p of arm) {
        const ang = p.t * 9 + (p.a * Math.PI * 2) / ARMS + t * 0.05;
        const rad = p.t * R;
        const spread = 5 + p.t * 20;
        const x = cx + Math.cos(ang) * rad + p.j * spread;
        const y = cy + Math.sin(ang) * rad * 0.7 + p.j2 * spread;
        const a = 0.42 * (1 - p.t * 0.7);
        ctx.fillStyle = `rgba(90,210,255,${a})`;
        ctx.fillRect(x, y, p.r, p.r);
      }

      // --- twinkling stars ---
      for (const s of stars) {
        s.x += s.vx; s.y += s.vy;
        if (s.x < -2) s.x = w + 2; else if (s.x > w + 2) s.x = -2;
        if (s.y < -2) s.y = h + 2; else if (s.y > h + 2) s.y = -2;
        const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
        const a = s.base * (0.25 + 0.75 * tw);
        ctx.fillStyle = `rgba(${s.c[0]},${s.c[1]},${s.c[2]},${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.2832);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }} />;
}