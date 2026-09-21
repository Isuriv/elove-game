import { useEffect, useRef } from "react";

type Star = {
  baseX: number;
  baseY: number;
  depth: number;
  twinkle: number;
  tint: number;
};

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const stars = createStars(160);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (motionQuery.matches) paint(context, width, height, stars, 0, false);
    };

    const tick = (time: number) => {
      paint(context, width, height, stars, time, true);
      frame = window.requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    if (!motionQuery.matches) frame = window.requestAnimationFrame(tick);

    const onMotion = () => {
      window.cancelAnimationFrame(frame);
      if (motionQuery.matches) {
        paint(context, width, height, stars, 0, false);
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };
    motionQuery.addEventListener("change", onMotion);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      motionQuery.removeEventListener("change", onMotion);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}

function createStars(count: number): Star[] {
  const rand = mulberry32(0x5f3759df);
  const stars: Star[] = [];
  for (let index = 0; index < count; index += 1) {
    stars.push({
      baseX: rand(),
      baseY: rand(),
      depth: 0.4 + rand() * 1.4,
      twinkle: rand() * Math.PI * 2,
      tint: rand(),
    });
  }
  return stars;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paint(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  stars: readonly Star[],
  time: number,
  motion: boolean,
) {
  context.clearRect(0, 0, width, height);
  const cx = width * 0.5;
  const cy = height * 0.42;
  const lensR = Math.min(width, height) * 0.2;

  const nebula = context.createRadialGradient(cx, cy, lensR * 0.15, cx, cy, Math.max(width, height) * 0.72);
  nebula.addColorStop(0, "rgba(48, 28, 14, 0)");
  nebula.addColorStop(0.32, "rgba(72, 42, 18, 0.16)");
  nebula.addColorStop(0.58, "rgba(36, 28, 72, 0.18)");
  nebula.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = nebula;
  context.fillRect(0, 0, width, height);

  for (const star of stars) {
    const drift = motion ? time * 0.000012 * star.depth : 0;
    let x = ((star.baseX + drift) % 1) * width;
    let y = star.baseY * height;
    const dx = x - cx;
    const dy = y - cy;
    const radius = Math.hypot(dx, dy) || 1;
    const ring = Math.exp(-((radius - lensR) ** 2) / (2 * (lensR * 0.16) ** 2));
    const bend = ring * lensR * 0.28;
    x += (dx / radius) * bend;
    y += (dy / radius) * bend;
    const alpha = 0.28 + (0.55 + 0.45 * Math.sin(time * 0.001 + star.twinkle)) * star.depth * 0.35;
    context.fillStyle = starColor(star.tint, alpha);
    context.beginPath();
    context.arc(x, y, star.depth * 1.15, 0, Math.PI * 2);
    context.fill();
  }

  context.lineWidth = 1;
  context.strokeStyle = "rgba(228, 161, 90, 0.16)";
  context.beginPath();
  context.ellipse(cx, cy, lensR * 1.05, lensR * 0.68, -0.25, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(168, 148, 224, 0.14)";
  context.beginPath();
  context.ellipse(cx, cy, lensR * 1.42, lensR * 0.92, 0.45, 0, Math.PI * 2);
  context.stroke();
}

function starColor(tint: number, alpha: number): string {
  if (tint > 0.93) return `rgba(228, 161, 90, ${alpha})`;
  if (tint > 0.86) return `rgba(176, 156, 224, ${alpha})`;
  return `rgba(243, 236, 223, ${alpha * 0.85})`;
}
