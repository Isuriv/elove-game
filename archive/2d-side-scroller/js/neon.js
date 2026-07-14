/* Procedural neon synthwave backgrounds matching reference aesthetic */
import { CFG } from "./config.js";

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

/** Sunset sky: indigo → magenta → pink → orange (ref 1) */
export function bakeSynthSky(w = 480, h = 270) {
  const { c, ctx } = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1a0a2e");
  g.addColorStop(0.22, "#3a1460");
  g.addColorStop(0.45, "#c030a0");
  g.addColorStop(0.62, "#ff6ab5");
  g.addColorStop(0.78, "#ff8a60");
  g.addColorStop(1, "#ffc050");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Soft pink clouds
  const clouds = [
    [40, 70, 50, 10],
    [120, 90, 70, 12],
    [220, 60, 55, 9],
    [320, 85, 80, 11],
    [400, 55, 45, 8],
  ];
  for (const [x, y, cw, ch] of clouds) {
    ctx.fillStyle = "rgba(255, 140, 200, 0.35)";
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = "rgba(255, 180, 220, 0.25)";
    ctx.fillRect(x + 6, y - 3, cw * 0.6, ch - 2);
  }

  // Horizon haze
  const haze = ctx.createLinearGradient(0, h * 0.7, 0, h);
  haze.addColorStop(0, "rgba(255, 180, 100, 0)");
  haze.addColorStop(1, "rgba(255, 120, 180, 0.25)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.7, w, h * 0.3);

  return c;
}

/** Night teal sky with jagged cloud ridge (ref 2) */
export function bakeNightSky(w = 480, h = 270) {
  const { c, ctx } = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#2a0818");
  g.addColorStop(0.35, "#3a1028");
  g.addColorStop(0.55, "#1a4050");
  g.addColorStop(1, "#0a6070");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Jagged silhouette ridge
  ctx.fillStyle = "#180818";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.42);
  for (let x = 0; x <= w; x += 8) {
    const y = h * 0.38 + Math.sin(x * 0.04) * 10 + (x % 24 === 0 ? -14 : 0);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();

  // Shooting-star streaks
  ctx.strokeStyle = "#7efcff";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const x = 30 + i * 70;
    const y = 20 + (i % 3) * 18;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40, y + 6);
    ctx.stroke();
    ctx.strokeStyle = i % 2 ? "#ff66cc" : "#7efcff";
  }

  return c;
}

/** Far city silhouette — magenta towers + cyan windows */
export function bakeCityFar(w = 480, h = 90) {
  const { c, ctx } = canvas(w, h);
  const colors = ["#7a1878", "#4a2068", "#a020a8", "#3a2878", "#c02898", "#582070"];
  let x = 0;
  while (x < w) {
    const bw = 16 + ((x * 7) % 30);
    const bh = 50 + ((x * 13) % 110);
    ctx.fillStyle = colors[x % colors.length];
    ctx.fillRect(x, h - bh, bw, bh);
    // windows cyan / yellow
    for (let wy = h - bh + 6; wy < h - 6; wy += 7) {
      for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
        if ((wx + wy) % 4 === 0) continue;
        ctx.fillStyle = (wx + wy) % 9 === 0 ? "#ffe066" : "#66f0ff";
        ctx.fillRect(wx, wy, 2, 3);
      }
    }
    // neon rim
    ctx.fillStyle = "#ff2ea6";
    ctx.fillRect(x, h - bh, bw, 2);
    ctx.fillStyle = "#ff9ad5";
    ctx.fillRect(x, h - bh, bw, 1);
    x += bw + 1;
  }
  return c;
}

/** Near city strip — denser neon signs / industrial (ref look) */
export function bakeCityNear(w = 480, h = 72) {
  const { c, ctx } = canvas(w, h);
  let x = 0;
  let i = 0;
  while (x < w) {
    const bw = 30 + (i % 5) * 12;
    const bh = 55 + (i % 4) * 24;
    ctx.fillStyle = i % 2 ? "#241050" : "#182048";
    ctx.fillRect(x, h - bh, bw, bh);

    // Sign panel
    if (i % 3 === 0) {
      ctx.fillStyle = "#00e8ff";
      ctx.fillRect(x + 4, h - bh + 10, bw - 8, 18);
      ctx.fillStyle = "#081018";
      ctx.fillRect(x + 6, h - bh + 12, bw - 12, 14);
      ctx.fillStyle = "#ff2ea6";
      for (let s = 0; s < 4; s++) ctx.fillRect(x + 8 + s * 5, h - bh + 15, 3, 8);
    }

    // Scaffold / neon tape
    if (i % 4 === 1) {
      ctx.strokeStyle = "#ff2ea6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 2, h - bh + 20);
      ctx.lineTo(x + bw - 2, h - 10);
      ctx.moveTo(x + bw - 2, h - bh + 20);
      ctx.lineTo(x + 2, h - 10);
      ctx.stroke();
      ctx.fillStyle = "#ffe066";
      ctx.fillRect(x + 6, h - bh + 28, bw - 12, 12);
    }

    // Magenta facade stripe
    if (i % 5 === 2) {
      ctx.fillStyle = "#ff2ea6";
      ctx.fillRect(x + 2, h - bh + 8, 4, bh - 16);
    }

    // Cyan windows
    ctx.fillStyle = "#5cf0ff";
    for (let wy = h - bh + 8; wy < h - 8; wy += 9) {
      ctx.fillRect(x + 5, wy, 3, 4);
      ctx.fillRect(x + bw - 8, wy, 3, 4);
    }

    // Magenta roof line
    ctx.fillStyle = "#ff2ea6";
    ctx.fillRect(x, h - bh, bw, 3);
    ctx.fillStyle = "#ff9ad5";
    ctx.fillRect(x, h - bh, bw, 1);

    x += bw + 2;
    i++;
  }
  return c;
}

/** Ground tile: dark navy/purple with glowing magenta top edge */
export function bakeNeonGround(size = 32) {
  const { c, ctx } = canvas(size, size);
  ctx.fillStyle = "#14102e";
  ctx.fillRect(0, 0, size, size);
  // Grid / panel texture
  ctx.fillStyle = "#1c1640";
  for (let y = 4; y < size; y += 4) {
    for (let x = (y % 8 === 0 ? 0 : 2); x < size; x += 4) {
      ctx.fillRect(x, y, 2, 2);
    }
  }
  ctx.strokeStyle = "#2a2460";
  ctx.strokeRect(0, 3, size - 1, size - 4);
  // Thick magenta neon lip (matches refs)
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(0, 0, size, 3);
  ctx.fillStyle = "#ff7ec8";
  ctx.fillRect(0, 0, size, 2);
  ctx.fillStyle = "#ffe0f5";
  ctx.fillRect(0, 0, size, 1);
  // Soft under-glow
  ctx.fillStyle = "rgba(255, 46, 166, 0.45)";
  ctx.fillRect(0, 3, size, 2);
  // Tiny cyan accent lights
  ctx.fillStyle = "#00e8ff";
  ctx.fillRect(2, 6, 1, 1);
  ctx.fillRect(size - 4, 10, 1, 1);
  return c;
}

/** Platform slab with thick magenta rim */
export function bakeNeonPlatform(w = 16, h = 8) {
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = "#1a1040";
  ctx.fillRect(0, 3, w, h - 3);
  ctx.fillStyle = "#2a1860";
  ctx.fillRect(1, 4, w - 2, h - 5);
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(0, 0, w, 3);
  ctx.fillStyle = "#ff8ad0";
  ctx.fillRect(0, 0, w, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, 1);
  ctx.fillStyle = "rgba(255, 46, 166, 0.4)";
  ctx.fillRect(0, 3, w, 2);
  return c;
}

/** Utility pole prop */
export function bakeUtilityPole() {
  const { c, ctx } = canvas(8, 40);
  ctx.fillStyle = "#6a7080";
  ctx.fillRect(3, 0, 2, 40);
  ctx.fillStyle = "#2a2a30";
  ctx.fillRect(0, 8, 8, 2);
  ctx.fillRect(0, 18, 8, 2);
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(1, 24, 6, 5);
  ctx.fillStyle = "#101018";
  ctx.fillRect(1, 24, 6, 1);
  ctx.fillRect(1, 28, 6, 1);
  ctx.fillStyle = "#5ce1ff";
  ctx.fillRect(0, 4, 2, 2);
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(3, 4, 2, 2);
  ctx.fillStyle = "#7dffb3";
  ctx.fillRect(6, 4, 2, 2);
  return c;
}

/** Neon vending kiosk */
export function bakeKiosk() {
  const { c, ctx } = canvas(16, 24);
  ctx.fillStyle = "#2a2048";
  ctx.fillRect(1, 2, 14, 22);
  ctx.fillStyle = "#00e8ff";
  ctx.fillRect(3, 5, 10, 8);
  ctx.fillStyle = "#0a1828";
  ctx.fillRect(4, 6, 8, 6);
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(5, 7, 2, 3);
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(9, 7, 2, 3);
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(1, 2, 14, 2);
  return c;
}

/** Elevated track / neon ribbon segment */
export function bakeNeonTrack(w = 64, h = 6) {
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = "#3a4870";
  ctx.fillRect(0, 2, w, 2);
  ctx.fillStyle = "#ff2ea6";
  for (let x = 0; x < w; x += 6) ctx.fillRect(x, 0, 3, 2);
  ctx.fillStyle = "#7efcff";
  ctx.fillRect(0, 3, w, 1);
  return c;
}

export function bakeNeonSet() {
  return {
    skySunset: bakeSynthSky(),
    skyNight: bakeNightSky(),
    cityFar: bakeCityFar(),
    cityNear: bakeCityNear(),
    ground: bakeNeonGround(32),
    platform: bakeNeonPlatform(32, 12),
    pole: bakeUtilityPole(),
    kiosk: bakeKiosk(),
    track: bakeNeonTrack(),
  };
}
