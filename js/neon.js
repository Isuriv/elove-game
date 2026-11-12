/* Procedural neon synthwave backgrounds matching reference aesthetic */
import { CFG } from "./config.js?v=deploy-assets-20261111";

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

/** Sunset sky: soft lilac -> magenta -> pink -> peach (brighter neon-pastel) */
export function bakeSynthSky(w = 480, h = 270) {
  const { c, ctx } = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#6b3d9e");
  g.addColorStop(0.2, "#9a48c0");
  g.addColorStop(0.42, "#e050b8");
  g.addColorStop(0.58, "#ff6ec7");
  g.addColorStop(0.74, "#ff9a78");
  g.addColorStop(1, "#ffd078");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Soft pink / lilac clouds
  const clouds = [
    [40, 70, 50, 10],
    [120, 90, 70, 12],
    [220, 60, 55, 9],
    [320, 85, 80, 11],
    [400, 55, 45, 8],
    [60, 40, 36, 8],
    [280, 48, 42, 9],
  ];
  for (const [x, y, cw, ch] of clouds) {
    ctx.fillStyle = "rgba(255, 160, 220, 0.42)";
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = "rgba(255, 200, 235, 0.32)";
    ctx.fillRect(x + 6, y - 3, cw * 0.6, ch - 2);
    ctx.fillStyle = "rgba(200, 140, 255, 0.28)";
    ctx.fillRect(x - 4, y + 2, cw * 0.4, ch - 1);
  }

  // Horizon haze - warm peach into magenta
  const haze = ctx.createLinearGradient(0, h * 0.7, 0, h);
  haze.addColorStop(0, "rgba(255, 200, 140, 0)");
  haze.addColorStop(1, "rgba(255, 140, 200, 0.3)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.7, w, h * 0.3);

  return c;
}

/** Dusk teal sky with jagged cloud ridge - mid-tones, not near-black */
export function bakeNightSky(w = 480, h = 270) {
  const { c, ctx } = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#5a2860");
  g.addColorStop(0.35, "#6a3878");
  g.addColorStop(0.55, "#3a6880");
  g.addColorStop(1, "#2a90a0");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Jagged silhouette ridge
  ctx.fillStyle = "#4a2870";
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
  ctx.strokeStyle = "#7df9ff";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const x = 30 + i * 70;
    const y = 20 + (i % 3) * 18;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40, y + 6);
    ctx.stroke();
    ctx.strokeStyle = i % 2 ? "#ff6ec7" : "#7df9ff";
  }

  return c;
}

/** Far city silhouette - lilac / magenta towers + cyan windows */
export function bakeCityFar(w = 480, h = 90) {
  const { c, ctx } = canvas(w, h);
  const colors = ["#b048a8", "#8050b0", "#c858b8", "#6a48a0", "#d060c0", "#9060b8"];
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
        ctx.fillStyle = (wx + wy) % 9 === 0 ? "#ffe066" : "#7df9ff";
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

/** Near city strip - denser neon signs / industrial (ref look) */
export function bakeCityNear(w = 480, h = 72) {
  const { c, ctx } = canvas(w, h);
  let x = 0;
  let i = 0;
  while (x < w) {
    const bw = 30 + (i % 5) * 12;
    const bh = 55 + (i % 4) * 24;
    ctx.fillStyle = i % 2 ? "#6a48a8" : "#5a58a0";
    ctx.fillRect(x, h - bh, bw, bh);

    // Sign panel
    if (i % 3 === 0) {
      ctx.fillStyle = "#00e8ff";
      ctx.fillRect(x + 4, h - bh + 10, bw - 8, 18);
      ctx.fillStyle = "#2a4868";
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

/** Ground tile: mid lilac panels with glowing magenta top edge */
export function bakeNeonGround(size = 16) {
  const { c, ctx } = canvas(size, size);
  ctx.fillStyle = "#5a4498";
  ctx.fillRect(0, 0, size, size);
  // Grid / panel texture
  ctx.fillStyle = "#6a54a8";
  for (let y = 4; y < size; y += 4) {
    for (let x = (y % 8 === 0 ? 0 : 2); x < size; x += 4) {
      ctx.fillRect(x, y, 2, 2);
    }
  }
  ctx.strokeStyle = "#8a70c0";
  ctx.strokeRect(0, 3, size - 1, size - 4);
  // Thick magenta neon lip (matches refs)
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(0, 0, size, 3);
  ctx.fillStyle = "#ff6ec7";
  ctx.fillRect(0, 0, size, 2);
  ctx.fillStyle = "#ffe0f5";
  ctx.fillRect(0, 0, size, 1);
  // Soft under-glow
  ctx.fillStyle = "rgba(255, 110, 199, 0.5)";
  ctx.fillRect(0, 3, size, 2);
  // Tiny cyan accent lights
  ctx.fillStyle = "#00e8ff";
  ctx.fillRect(2, 6, 1, 1);
  ctx.fillRect(size - 4, 10, 1, 1);
  return c;
}

/** Grip pad - matte lilac chassis + purple neon tread lip (walkable default) */
export function bakeNeonPlatform(w = 16, h = 8) {
  const { c, ctx } = canvas(w, h);
  // Lilac / lavender body (matte, not glass)
  ctx.fillStyle = "#7a62c0";
  ctx.fillRect(0, 3, w, h - 3);
  ctx.fillStyle = "#8f78d4";
  ctx.fillRect(1, 4, w - 2, h - 5);
  // Panel seams
  ctx.fillStyle = "#6a52b0";
  for (let x = 3; x < w - 2; x += 4) ctx.fillRect(x, 4, 1, h - 6);
  // Thick purple neon tread lip
  ctx.fillStyle = "#b388ff";
  ctx.fillRect(0, 0, w, 3);
  ctx.fillStyle = "#d6b6ff";
  ctx.fillRect(0, 0, w, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, 1);
  // Grip dashes on walk surface
  ctx.fillStyle = "#9a6ef0";
  for (let x = 1; x < w - 1; x += 3) ctx.fillRect(x, 2, 2, 1);
  ctx.fillStyle = "rgba(179, 136, 255, 0.55)";
  ctx.fillRect(0, 3, w, 2);
  // Corner brackets (grip identity)
  ctx.fillStyle = "#e8d4ff";
  ctx.fillRect(0, 0, 2, 4);
  ctx.fillRect(w - 2, 0, 2, 4);
  // Underside rivets
  ctx.fillStyle = "#5a4498";
  ctx.fillRect(2, h - 2, 2, 1);
  ctx.fillRect(w - 5, h - 2, 2, 1);
  ctx.fillStyle = "#d6b6ff";
  ctx.fillRect(6, h - 2, 1, 1);
  return c;
}

/** Ice slip pad - frosted cyan glass body (no purple chassis) */
export function bakeSlipPlatform(w = 32, h = 10) {
  const { c, ctx } = canvas(w, h);
  // Cool ice-blue chassis (reads as ice, not metal purple)
  ctx.fillStyle = "#5aa8d8";
  ctx.fillRect(0, 4, w, h - 4);
  ctx.fillStyle = "#7ec8f0";
  ctx.fillRect(1, 5, w - 2, h - 6);
  // Soft pastel frost veins
  ctx.fillStyle = "#b8d8ff";
  for (let x = 2; x < w - 2; x += 6) ctx.fillRect(x, 6, 3, 1);
  // Thick glossy cyan ice lip
  ctx.fillStyle = "#00e8ff";
  ctx.fillRect(0, 0, w, 4);
  ctx.fillStyle = "#7df9ff";
  ctx.fillRect(0, 0, w, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, 1);
  ctx.fillStyle = "rgba(0, 232, 255, 0.45)";
  ctx.fillRect(0, 4, w, 2);
  // Diagonal frost cracks
  ctx.fillStyle = "#fff5fb";
  for (let i = 0; i < 4; i++) {
    const x = 3 + i * 7;
    ctx.fillRect(x, 1, 3, 1);
    ctx.fillRect(x + 2, 2, 2, 1);
  }
  // Specular streak
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(4, 1, Math.max(5, (w / 3) | 0), 1);
  // Underside cyan drip LEDs
  for (let x = 2; x < w - 2; x += 4) {
    ctx.fillStyle = "#7df9ff";
    ctx.fillRect(x, h - 2, 2, 1);
    ctx.fillStyle = "#00e8ff";
    ctx.fillRect(x, h - 1, 1, 1);
  }
  return c;
}

/** Bounce pad - warm rose chassis + gold chevron launch strip */
export function bakeBouncePlatform(w = 32, h = 12) {
  const { c, ctx } = canvas(w, h);
  // Warm rose / peach body (distinct from purple grip + cyan ice)
  ctx.fillStyle = "#d878a8";
  ctx.fillRect(0, 5, w, h - 5);
  ctx.fillStyle = "#e890b8";
  ctx.fillRect(1, 6, w - 2, h - 7);
  // Hot pink neon under-rim
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(0, 3, w, 3);
  ctx.fillStyle = "#ff6ec7";
  ctx.fillRect(0, 3, w, 1);
  // Gold launch deck
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(0, 0, w, 3);
  ctx.fillStyle = "#fff0a8";
  ctx.fillRect(0, 0, w, 1);
  // Repeating upward chevrons across the pad
  ctx.fillStyle = "#ff2ea6";
  for (let x = 2; x < w - 4; x += 8) {
    ctx.fillRect(x + 2, 1, 3, 1);
    ctx.fillRect(x + 1, 2, 5, 1);
    ctx.fillRect(x + 3, 0, 1, 1);
  }
  // Center gold arrow stack
  const mid = (w / 2) | 0;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(mid - 1, 0, 2, 2);
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(mid - 3, 4, 6, 2);
  ctx.fillRect(mid - 1, 3, 2, 1);
  // Underside gold / pink LEDs
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(3, h - 2, 3, 1);
  ctx.fillRect(w - 7, h - 2, 3, 1);
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(mid - 2, h - 2, 4, 1);
  return c;
}

/**
 * Pixel hanging cable / wire dangling from a platform edge.
 * seed varies length and sway pattern.
 */
export function bakeHangingCable(seed = 0, maxLen = 28) {
  const w = 10;
  const h = maxLen + 4;
  const { c, ctx } = canvas(w, h);
  const len = 14 + ((seed * 7) % (maxLen - 12));
  const colors = ["#2a3048", "#3a4868", "#ff2ea6", "#00e8ff", "#6a7088"];
  let x = 4 + (seed % 3) - 1;
  // Mount clamp on platform lip
  ctx.fillStyle = "#8a90a8";
  ctx.fillRect(3, 0, 4, 2);
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(4, 0, 2, 1);
  for (let y = 2; y < len; y++) {
    const sway = Math.sin((y + seed) * 0.45) * 1.6 + ((seed + y) % 3) - 1;
    const px = Math.max(0, Math.min(w - 2, Math.round(x + sway)));
    const thick = y % 5 === 0 ? 2 : 1;
    ctx.fillStyle = colors[(y + seed) % colors.length];
    ctx.fillRect(px, y, thick, 1);
    // Occasional spark / neon break (static glints; live flashes draw at runtime)
    if ((y + seed * 3) % 11 === 0) {
      ctx.fillStyle = "#ffe066";
      ctx.fillRect(px, y, 1, 1);
    }
    if ((y + seed * 5) % 17 === 0) {
      ctx.fillStyle = "#7efcff";
      ctx.fillRect(px, y, 1, 1);
      ctx.fillRect(Math.min(w - 1, px + 1), y, 1, 1);
    }
    if (y % 4 === 0) x += ((seed + y) % 2) ? 1 : -1;
  }
  // Frayed tip
  ctx.fillStyle = "#ff7ec8";
  const tipX = Math.max(0, Math.min(w - 3, Math.round(x + Math.sin(len + seed))));
  ctx.fillRect(tipX, len, 1, 1);
  ctx.fillRect(tipX + 1, len + 1, 1, 1);
  ctx.fillRect(tipX - 1, len + 2, 1, 2);
  return c;
}

export function bakeCableBundle() {
  return [0, 1, 2, 3, 4, 5].map((s) => bakeHangingCable(s, 26 + (s % 3) * 4));
}

/** Faux-3D isometric power-up crystals / cells (still 2D sprites). */
export function bakeIsoPowerups() {
  const candies = {
    lollipop: bakeCollectibleCandy(16, "lollipop"),
    "candy-cane": bakeCollectibleCandy(16, "candy-cane"),
    gumdrop: bakeCollectibleCandy(16, "gumdrop"),
    "wrapped-chocolate": bakeCollectibleCandy(16, "wrapped-chocolate"),
    "jelly-bean": bakeCollectibleCandy(16, "jelly-bean"),
    hard: bakeCollectibleCandy(16, "hard"),
  };
  return {
    shield: bakeIsoGem(14, "#00e8ff", "#7efcff", "#104858"),
    battery: bakeIsoCell(14),
    heart: bakeIsoHeart(14),
    magnet: bakeIsoMagnet(14),
    candy: candies.lollipop,
    candies,
    toffee: candies["wrapped-chocolate"], // legacy alias
    toy: bakeCollectibleToy(16),
    "moon-rock": bakeCollectibleMoonRock(16),
    "mars-rock": bakeCollectibleMarsRock(16),
    "starship-tile": bakeCollectibleStarshipTile(16),
    clue: bakeCollectibleClue(16),
    "neuralink-device": bakeCollectibleNeuralinkDevice(16),
    gear: bakeCollectibleGear(16),
    engineering: bakeCollectibleEngineering(16),
    "helper-droid": bakeCollectibleHelperDroid(16),
    "gun-pistol": bakeIsoPinkGun(16, "pistol"),
    "gun-blaster": bakeIsoPinkGun(16, "blaster"),
    "gun-cannon": bakeIsoPinkGun(16, "cannon"),
  };
}

function bakeCollectibleClue(size) {
  // Fallback pink heart if Three.js clue-heart frames are missing
  return bakeIsoHeart(size);
}

/** Pink blaster pickup fallback (chunky neon pixel, black outline). */
function bakeIsoPinkGun(size, variant) {
  const { c, ctx } = canvas(size, size);
  ctx.clearRect(0, 0, size, size);
  const ink = "#000000";
  const body = "#ff2ea6";
  const light = "#ff9ad5";
  const dark = "#c01870";
  const cyan = "#00e8ff";
  const cream = "#fff5fb";

  const rect = (x, y, w, h, fill) => {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  };

  switch (variant) {
    case "pistol":
      rect(2, 5, 11, 6, ink);
      rect(4, 10, 4, 5, ink);
      rect(3, 6, 9, 4, body);
      rect(10, 7, 3, 2, body);
      rect(4, 10, 3, 4, dark);
      rect(4, 6, 4, 1, light);
      rect(11, 7, 1, 1, cream);
      rect(7, 8, 1, 1, cyan);
      rect(5, 11, 1, 1, cyan);
      break;
    case "blaster":
      rect(1, 5, 14, 6, ink);
      rect(4, 10, 5, 5, ink);
      rect(2, 6, 12, 4, body);
      rect(12, 7, 3, 2, light);
      rect(5, 10, 3, 4, dark);
      rect(3, 6, 5, 1, light);
      rect(6, 7, 2, 2, cyan);
      rect(10, 8, 1, 1, cyan);
      rect(8, 6, 2, 1, cream);
      break;
    case "cannon":
      rect(1, 4, 14, 8, ink);
      rect(3, 11, 6, 4, ink);
      rect(2, 5, 12, 6, body);
      rect(12, 6, 3, 4, dark);
      rect(4, 11, 4, 3, dark);
      rect(3, 5, 6, 2, light);
      rect(7, 7, 3, 2, cyan);
      rect(13, 7, 1, 2, cream);
      rect(5, 12, 1, 1, cyan);
      break;
    default: {
      const _exhaustive = variant;
      void _exhaustive;
      rect(2, 5, 11, 6, ink);
      rect(3, 6, 9, 4, body);
      break;
    }
  }
  return c;
}

function bakeCollectibleCandy(size, kind) {
  const { c, ctx } = canvas(size, size);
  // Transparent plate - black outline hugs candy silhouette only
  ctx.clearRect(0, 0, size, size);
  switch (kind) {
    case "lollipop": {
      ctx.fillStyle = "#000000";
      ctx.fillRect(size / 2 - 1, size - 6, 2, 5);
      ctx.fillStyle = "#ffe0f0";
      ctx.fillRect(size / 2 - 1, size - 5, 1, 4);
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2 - 1, size / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff6ec7";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2 - 1, size / 2 - 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe0f0";
      ctx.fillRect(size / 2 - 2, size / 2 - 3, 3, 2);
      ctx.fillStyle = "#00e8ff";
      ctx.fillRect(size / 2 + 2, size / 2 - 4, 1, 1);
      break;
    }
    case "candy-cane": {
      ctx.fillStyle = "#000000";
      ctx.fillRect(3, 2, 3, size - 4);
      ctx.fillRect(3, 2, 8, 3);
      ctx.fillStyle = "#ff6ec7";
      ctx.fillRect(4, 3, 1, size - 6);
      ctx.fillRect(4, 3, 6, 1);
      ctx.fillStyle = "#fff5fb";
      ctx.fillRect(5, 5, 1, 2);
      ctx.fillRect(5, 9, 1, 2);
      break;
    }
    case "gumdrop": {
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.ellipse(size / 2, size / 2 + 1, size / 2 - 2, size / 2 - 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff2ea6";
      ctx.beginPath();
      ctx.ellipse(size / 2, size / 2 + 1, size / 2 - 3, size / 2 - 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe066";
      ctx.fillRect(size / 2 - 2, size / 2 - 3, 2, 1);
      break;
    }
    case "jelly-bean": {
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.ellipse(size / 2, size / 2, size / 2 - 2, size / 2 - 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#00e8ff";
      ctx.beginPath();
      ctx.ellipse(size / 2, size / 2, size / 2 - 3, size / 2 - 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(size / 2 - 2, size / 2 - 2, 2, 1);
      break;
    }
    case "hard": {
      ctx.fillStyle = "#000000";
      ctx.fillRect(1, 5, 3, 5);
      ctx.fillRect(size - 4, 5, 3, 5);
      ctx.fillStyle = "#ff7ec8";
      ctx.fillRect(2, 6, 2, 3);
      ctx.fillRect(size - 4, 6, 2, 3);
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffb0d8";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "wrapped-chocolate": {
      // Wrapped chocolate candy
      ctx.fillStyle = "#000000";
      ctx.fillRect(1, 5, 4, 6);
      ctx.fillRect(size - 5, 5, 4, 6);
      ctx.fillStyle = "#ff6ec7";
      ctx.fillRect(2, 6, 3, 4);
      ctx.fillRect(size - 5, 6, 3, 4);
      ctx.fillStyle = "#ffe0f0";
      ctx.fillRect(2, 6, 1, 1);
      ctx.fillRect(size - 3, 6, 1, 1);
      ctx.fillStyle = "#000000";
      ctx.fillRect(4, 3, size - 8, size - 6);
      ctx.fillStyle = "#ffb040";
      ctx.fillRect(5, 4, size - 10, size - 8);
      ctx.fillStyle = "#ffd078";
      ctx.fillRect(6, 5, size - 13, 3);
      ctx.fillStyle = "#fff4d0";
      ctx.fillRect(6, 5, 1, 1);
      break;
    }
    default: {
      const _exhaustive = kind;
      void _exhaustive;
      // Unknown kind - draw wrapped chocolate shape
      ctx.fillStyle = "#000000";
      ctx.fillRect(4, 3, size - 8, size - 6);
      ctx.fillStyle = "#ffb040";
      ctx.fillRect(5, 4, size - 10, size - 8);
      break;
    }
  }
  return c;
}

function bakeCollectibleToy(size) {
  const { c, ctx } = canvas(size, size);
  // Tiny wheeled toy bot - Tesla Works collectible
  ctx.fillStyle = "#104858";
  ctx.fillRect(3, 5, 10, 7);
  ctx.fillStyle = "#00e8ff";
  ctx.fillRect(3, 4, 10, 7);
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(5, 6, 6, 3);
  ctx.fillStyle = "#7df9ff";
  ctx.fillRect(5, 5, 2, 2);
  ctx.fillRect(9, 5, 2, 2);
  ctx.fillStyle = "#3a2458";
  ctx.fillRect(3, 11, 3, 3);
  ctx.fillRect(10, 11, 3, 3);
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(3, 11, 3, 2);
  ctx.fillRect(10, 11, 3, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(4, 5, 1, 1);
  return c;
}

function bakeCollectibleMoonRock(size) {
  const { c, ctx } = canvas(size, size);
  ctx.fillStyle = "#3a3a48";
  ctx.fillRect(4, 5, 8, 7);
  ctx.fillRect(3, 7, 10, 4);
  ctx.fillStyle = "#c8c8d8";
  ctx.fillRect(4, 4, 8, 7);
  ctx.fillRect(3, 6, 10, 4);
  ctx.fillStyle = "#9090a8";
  ctx.fillRect(6, 6, 3, 2);
  ctx.fillRect(9, 9, 2, 2);
  ctx.fillStyle = "#00e8ff";
  ctx.fillRect(5, 5, 1, 1);
  ctx.fillRect(11, 7, 1, 1);
  ctx.fillRect(7, 10, 1, 1);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(5, 4, 1, 1);
  return c;
}

function bakeCollectibleMarsRock(size) {
  const { c, ctx } = canvas(size, size);
  ctx.fillStyle = "#5a2010";
  ctx.fillRect(4, 5, 8, 7);
  ctx.fillRect(3, 7, 10, 4);
  ctx.fillStyle = "#e06030";
  ctx.fillRect(4, 4, 8, 7);
  ctx.fillRect(3, 6, 10, 4);
  ctx.fillStyle = "#a03818";
  ctx.fillRect(6, 7, 3, 2);
  ctx.fillRect(8, 5, 2, 2);
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(5, 5, 1, 1);
  ctx.fillRect(10, 8, 1, 1);
  ctx.fillRect(7, 10, 1, 1);
  ctx.fillStyle = "#ffc090";
  ctx.fillRect(5, 4, 1, 1);
  return c;
}

function bakeCollectibleStarshipTile(size) {
  const { c, ctx } = canvas(size, size);
  // Hex heat-shield Starship tile - SpaceX Ascent collectible
  ctx.fillStyle = "#1A1A22";
  ctx.fillRect(5, 2, 6, 12);
  ctx.fillRect(3, 4, 10, 8);
  ctx.fillStyle = "#C8D4E0";
  ctx.fillRect(5, 1, 6, 12);
  ctx.fillRect(3, 3, 10, 8);
  ctx.fillStyle = "#2A2A32";
  ctx.fillRect(4, 5, 3, 3);
  ctx.fillRect(9, 5, 3, 3);
  ctx.fillRect(4, 9, 3, 3);
  ctx.fillRect(9, 9, 3, 3);
  ctx.fillStyle = "#5BC0EB";
  ctx.fillRect(3, 3, 1, 1);
  ctx.fillRect(12, 7, 1, 1);
  ctx.fillRect(6, 12, 1, 1);
  ctx.fillStyle = "#FF6B2C";
  ctx.fillRect(7, 6, 2, 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(5, 2, 1, 1);
  return c;
}

function bakeCollectibleNeuralinkDevice(size) {
  const { c, ctx } = canvas(size, size);
  // Coin implant + thread electrodes - Neuralink collectible
  ctx.fillStyle = "#1a1e24";
  ctx.beginPath();
  ctx.ellipse(8, 7, 5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2A2F36";
  ctx.beginPath();
  ctx.ellipse(8, 6, 5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4DB6AC";
  ctx.fillRect(6, 5, 4, 2);
  ctx.fillStyle = "#7DDFE8";
  ctx.fillRect(7, 4, 2, 2);
  ctx.fillStyle = "#7DDFE8";
  ctx.fillRect(3, 10, 1, 4);
  ctx.fillRect(8, 11, 1, 4);
  ctx.fillRect(12, 10, 1, 4);
  ctx.fillStyle = "#E8A84A";
  ctx.fillRect(7, 6, 1, 1);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(6, 4, 1, 1);
  return c;
}

function bakeCollectibleGear(size) {
  const { c, ctx } = canvas(size, size);
  // Steel cog - Tesla Works engineering collectible
  ctx.fillStyle = "#3a4858";
  ctx.fillRect(6, 2, 4, 12);
  ctx.fillRect(2, 6, 12, 4);
  ctx.fillRect(3, 3, 3, 3);
  ctx.fillRect(10, 3, 3, 3);
  ctx.fillRect(3, 10, 3, 3);
  ctx.fillRect(10, 10, 3, 3);
  ctx.fillStyle = "#c8d4e0";
  ctx.fillRect(6, 1, 4, 12);
  ctx.fillRect(1, 6, 14, 4);
  ctx.fillRect(3, 3, 3, 3);
  ctx.fillRect(10, 3, 3, 3);
  ctx.fillRect(3, 10, 3, 3);
  ctx.fillRect(10, 10, 3, 3);
  ctx.fillStyle = "#00e8ff";
  ctx.fillRect(7, 6, 2, 4);
  ctx.fillRect(6, 7, 4, 2);
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(7, 7, 2, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(4, 4, 1, 1);
  return c;
}

function bakeCollectibleEngineering(size) {
  const { c, ctx } = canvas(size, size);
  // Circuit module / actuator brick - Tesla Works collectible
  ctx.fillStyle = "#1a2430";
  ctx.fillRect(3, 4, 10, 9);
  ctx.fillStyle = "#3a5068";
  ctx.fillRect(3, 3, 10, 9);
  ctx.fillStyle = "#00e8ff";
  ctx.fillRect(4, 5, 2, 2);
  ctx.fillRect(7, 5, 2, 2);
  ctx.fillRect(10, 5, 2, 2);
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(4, 8, 8, 2);
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(5, 4, 1, 1);
  ctx.fillRect(11, 9, 1, 1);
  ctx.fillStyle = "#7df9ff";
  ctx.fillRect(2, 6, 1, 4);
  ctx.fillRect(13, 6, 1, 4);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(4, 4, 1, 1);
  return c;
}

function bakeCollectibleHelperDroid(size) {
  const { c, ctx } = canvas(size, size);
  // Mini orbiting helper droid - Tesla Works ally pickup
  ctx.fillStyle = "#104858";
  ctx.beginPath();
  ctx.ellipse(8, 8, 5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c8d8e8";
  ctx.beginPath();
  ctx.ellipse(8, 7, 5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#00e8ff";
  ctx.fillRect(6, 6, 4, 3);
  ctx.fillStyle = "#7df9ff";
  ctx.fillRect(7, 6, 2, 2);
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(5, 10, 6, 1);
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(7, 2, 2, 2);
  ctx.fillRect(8, 1, 1, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(6, 5, 1, 1);
  return c;
}

function bakeIsoGem(size, top, light, dark) {
  const { c, ctx } = canvas(size, size);
  const m = (size / 2) | 0;
  // diamond / crystal isometric
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(m, 2);
  ctx.lineTo(size - 2, m);
  ctx.lineTo(m, size - 2);
  ctx.lineTo(2, m);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(m, 2);
  ctx.lineTo(size - 2, m);
  ctx.lineTo(m, m + 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(m, 2);
  ctx.lineTo(m, m + 1);
  ctx.lineTo(2, m);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(m - 1, m - 2, 1, 1);
  return c;
}

function bakeIsoCell(size) {
  const { c, ctx } = canvas(size, size);
  // isometric battery brick
  ctx.fillStyle = "#1a2840";
  ctx.fillRect(3, 5, 8, 7);
  ctx.fillStyle = "#2a4868";
  ctx.fillRect(4, 4, 8, 7);
  ctx.fillStyle = "#00e8ff";
  ctx.fillRect(5, 5, 6, 2);
  ctx.fillStyle = "#7dffb3";
  ctx.fillRect(5, 8, 2, 2);
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(8, 8, 2, 2);
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(6, 3, 4, 1);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(5, 5, 1, 1);
  return c;
}

function bakeIsoHeart(size) {
  const { c, ctx } = canvas(size, size);
  ctx.fillStyle = "#801040";
  ctx.fillRect(3, 5, 3, 3);
  ctx.fillRect(8, 5, 3, 3);
  ctx.fillRect(4, 7, 6, 4);
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(3, 4, 3, 3);
  ctx.fillRect(8, 4, 3, 3);
  ctx.fillRect(4, 6, 6, 4);
  ctx.fillRect(5, 10, 4, 1);
  ctx.fillRect(6, 11, 2, 1);
  ctx.fillStyle = "#ff9ad5";
  ctx.fillRect(4, 5, 1, 1);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(4, 4, 1, 1);
  // faux depth face
  ctx.fillStyle = "#501028";
  ctx.fillRect(10, 6, 1, 4);
  ctx.fillRect(9, 10, 1, 1);
  return c;
}

function bakeIsoMagnet(size) {
  const { c, ctx } = canvas(size, size);
  ctx.fillStyle = "#3a2060";
  ctx.fillRect(3, 4, 3, 8);
  ctx.fillRect(8, 4, 3, 8);
  ctx.fillRect(3, 4, 8, 3);
  ctx.fillStyle = "#b388ff";
  ctx.fillRect(3, 3, 3, 8);
  ctx.fillRect(8, 3, 3, 8);
  ctx.fillRect(3, 3, 8, 3);
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(3, 9, 3, 3);
  ctx.fillStyle = "#00e8ff";
  ctx.fillRect(8, 9, 3, 3);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(4, 4, 1, 1);
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

/** Toxic acid fluid tile - bright lime sludge (hazard, not a walkable pad) */
export function bakeToxicFluid(size = 16) {
  const { c, ctx } = canvas(size, size);
  // Bright mint / lime body (pastel hazard, avoid near-black)
  ctx.fillStyle = "#2a8858";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#3cb070";
  ctx.fillRect(0, 3, size, size - 3);
  ctx.fillStyle = "#52c888";
  for (let y = 5; y < size; y += 3) {
    ctx.fillRect(0, y, size, 1);
  }
  // Glowing toxic surface
  ctx.fillStyle = "#5ee8a0";
  ctx.fillRect(0, 1, size, 4);
  ctx.fillStyle = "#2dff9a";
  ctx.fillRect(0, 0, size, 2);
  ctx.fillStyle = "#c8ffe0";
  ctx.fillRect(0, 0, size, 1);
  // Bubbles + warning flecks
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(2, 6, 2, 2);
  ctx.fillRect(9, 10, 2, 2);
  ctx.fillStyle = "#fff5fb";
  ctx.fillRect(12, 7, 1, 1);
  ctx.fillStyle = "#ff6ec7";
  ctx.fillRect(5, 8, 1, 1);
  ctx.fillRect(14, 12, 1, 1);
  // Sickly under-glow
  ctx.fillStyle = "rgba(45, 255, 154, 0.5)";
  ctx.fillRect(0, 2, size, 3);
  return c;
}

/** Far mountain / ridge silhouette - soft magenta dusk */
export function bakeFarMountains(w = 480, h = 70) {
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = "#6a3890";
  ctx.beginPath();
  ctx.moveTo(0, h);
  let x = 0;
  while (x <= w) {
    const peak = 18 + ((x * 17) % 40);
    ctx.lineTo(x, h - peak);
    ctx.lineTo(x + 10 + (x % 7), h - peak + 8);
    ctx.lineTo(x + 22, h - (peak * 0.45));
    x += 28;
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  // Magenta rim light
  ctx.strokeStyle = "#ff6ec7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  x = 0;
  ctx.moveTo(0, h - 20);
  while (x <= w) {
    const peak = 18 + ((x * 17) % 40);
    ctx.lineTo(x, h - peak);
    x += 14;
  }
  ctx.stroke();
  // Soft cyan haze at base
  const g = ctx.createLinearGradient(0, h * 0.55, 0, h);
  g.addColorStop(0, "rgba(125, 249, 255, 0)");
  g.addColorStop(1, "rgba(255, 110, 199, 0.28)");
  ctx.fillStyle = g;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);
  return c;
}

/** Pixel cloud bank - pink/purple synth clouds */
export function bakeCloudBank(w = 480, h = 48) {
  const { c, ctx } = canvas(w, h);
  const blobs = [
    [20, 18, 40, 12],
    [80, 10, 55, 14],
    [160, 20, 48, 11],
    [230, 8, 60, 15],
    [320, 16, 50, 12],
    [390, 12, 45, 13],
    [440, 22, 36, 10],
  ];
  for (const [x, y, cw, ch] of blobs) {
    ctx.fillStyle = "rgba(214, 182, 255, 0.5)";
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = "rgba(255, 160, 220, 0.48)";
    ctx.fillRect(x + 4, y - 3, cw * 0.7, ch - 2);
    ctx.fillStyle = "rgba(255, 220, 240, 0.35)";
    ctx.fillRect(x + 10, y - 5, cw * 0.35, 4);
    ctx.fillStyle = "#ff6ec7";
    ctx.fillRect(x + 6, y + ch - 2, Math.max(4, cw * 0.3), 1);
  }
  return c;
}

/** Tiny flying car sprite for distant traffic */
export function bakeFlyingCar(seed = 0) {
  const { c, ctx } = canvas(18, 8);
  const body = seed % 2 === 0 ? "#ff2ea6" : "#00e8ff";
  const cabin = seed % 2 === 0 ? "#7efcff" : "#ff9ad5";
  ctx.fillStyle = body;
  ctx.fillRect(2, 3, 14, 3);
  ctx.fillStyle = cabin;
  ctx.fillRect(6, 1, 6, 3);
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(15, 4, 2, 1);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(3, 4, 1, 1);
  // Underside thruster glow
  ctx.fillStyle = seed % 2 === 0 ? "#7efcff" : "#ff7ec8";
  ctx.fillRect(5, 6, 3, 1);
  ctx.fillRect(11, 6, 2, 1);
  return c;
}

export function bakeFlyingCarSet() {
  return [0, 1, 2, 3].map((s) => bakeFlyingCar(s));
}

/** Cake-realm sky - frosting lilac -> pink -> cream peach */
export function bakeCakeSky(w = 480, h = 270) {
  const { c, ctx } = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#7a48b0");
  g.addColorStop(0.22, "#c060c8");
  g.addColorStop(0.45, "#ff7ec8");
  g.addColorStop(0.68, "#ffb0a0");
  g.addColorStop(0.85, "#ffe0b8");
  g.addColorStop(1, "#fff0d8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Soft frosting swirls
  for (const [x, y, cw, ch] of [
    [30, 50, 60, 14],
    [140, 70, 80, 16],
    [280, 40, 70, 12],
    [380, 65, 55, 14],
  ]) {
    ctx.fillStyle = "rgba(255, 200, 230, 0.4)";
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = "rgba(255, 240, 250, 0.28)";
    ctx.fillRect(x + 8, y - 4, cw * 0.55, ch - 3);
  }
  const haze = ctx.createLinearGradient(0, h * 0.65, 0, h);
  haze.addColorStop(0, "rgba(255, 180, 200, 0)");
  haze.addColorStop(1, "rgba(255, 160, 190, 0.35)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.65, w, h * 0.35);
  return c;
}

/** Distant cake-tier mountain ridge */
export function bakeCakeMountains(w = 480, h = 110) {
  const { c, ctx } = canvas(w, h);
  const tiers = [
    ["#c890d8", 0.55],
    ["#e8a0c8", 0.7],
    ["#ffb8d0", 0.88],
  ];
  for (const [col, base] of tiers) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, h);
    let x = 0;
    while (x <= w) {
      const peak = h * base - ((x * 13) % 28) - Math.sin(x * 0.03) * 10;
      ctx.lineTo(x, peak);
      x += 12;
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
  // Cherry dots on peaks
  ctx.fillStyle = "#ff2ea6";
  for (let x = 24; x < w; x += 48) {
    ctx.fillRect(x, Math.floor(h * 0.42 + (x % 20)), 3, 3);
  }
  ctx.fillStyle = "#00e8ff";
  ctx.fillRect(0, h - 3, w, 2);
  return c;
}

/** Mid cake scenery band */
export function bakeCakeMidscape(w = 480, h = 140) {
  const { c, ctx } = canvas(w, h);
  // Layered cake slabs
  const cakes = [
    [10, 70, 90, 60, "#ffe8c8"],
    [120, 50, 110, 80, "#ffd0e8"],
    [250, 65, 100, 65, "#ffe8c8"],
    [370, 45, 100, 85, "#ffd0e8"],
  ];
  for (const [x, y, cw, ch, body] of cakes) {
    ctx.fillStyle = body;
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = "#ff6ec7";
    ctx.fillRect(x, y, cw, 8);
    ctx.fillStyle = "#fff5fb";
    ctx.fillRect(x + 4, y + 2, cw - 8, 3);
    ctx.fillStyle = "#c89060";
    ctx.fillRect(x, y + ch * 0.45, cw, 4);
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(x + cw * 0.4, y - 6, 8, 8);
    ctx.fillStyle = "#ff2ea6";
    ctx.fillRect(x + cw * 0.4 + 2, y - 10, 4, 4);
  }
  // Candy poles
  ctx.fillStyle = "#00e8ff";
  for (let i = 0; i < 5; i++) {
    const x = 40 + i * 90;
    ctx.fillRect(x, 30, 4, h - 30);
    ctx.fillStyle = "#ff2ea6";
    ctx.fillRect(x, 30 + ((i * 17) % 20), 4, 6);
    ctx.fillStyle = "#00e8ff";
  }
  return c;
}

/** Soft frosting cloud puff (transparent bg) */
export function bakeCakeCloud(w = 64, h = 28) {
  const { c, ctx } = canvas(w, h);
  const blobs = [
    [8, 12, 22, 12],
    [22, 6, 28, 14],
    [40, 10, 18, 11],
  ];
  for (const [x, y, cw, ch] of blobs) {
    ctx.fillStyle = "rgba(255, 230, 245, 0.92)";
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = "rgba(255, 160, 220, 0.55)";
    ctx.fillRect(x + 2, y + ch - 4, cw - 4, 3);
    ctx.fillStyle = "rgba(125, 249, 255, 0.45)";
    ctx.fillRect(x + 4, y + 1, Math.max(4, cw * 0.35), 2);
  }
  return c;
}

/** Foreground frosting drip accents */
export function bakeCakeForeground(w = 480, h = 80) {
  const { c, ctx } = canvas(w, h);
  // Top drips
  for (let x = 0; x < w; x += 18) {
    const len = 10 + ((x * 7) % 22);
    ctx.fillStyle = "#ff6ec7";
    ctx.fillRect(x + 4, 0, 6, len);
    ctx.fillStyle = "#fff5fb";
    ctx.fillRect(x + 5, 0, 2, Math.max(4, len - 4));
    ctx.fillStyle = "#ff2ea6";
    ctx.fillRect(x + 5, len - 2, 4, 4);
  }
  // Bottom crumb ridge
  ctx.fillStyle = "#e8b898";
  ctx.fillRect(0, h - 18, w, 18);
  ctx.fillStyle = "#ff6ec7";
  ctx.fillRect(0, h - 20, w, 3);
  ctx.fillStyle = "#ffe066";
  for (let x = 8; x < w; x += 24) ctx.fillRect(x, h - 12, 2, 2);
  return c;
}

/** Tiny procedural pastry fallbacks (when Imagine assets missing) */
export function bakePastrySet() {
  const cupcake = (() => {
    const { c, ctx } = canvas(24, 24);
    ctx.fillStyle = "#ffe8c8";
    ctx.fillRect(7, 14, 10, 8);
    ctx.fillStyle = "#ff6ec7";
    ctx.fillRect(5, 8, 14, 8);
    ctx.fillStyle = "#fff5fb";
    ctx.fillRect(8, 6, 8, 4);
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(11, 3, 3, 3);
    ctx.fillStyle = "#ff2ea6";
    ctx.fillRect(12, 2, 2, 2);
    ctx.fillStyle = "#00e8ff";
    ctx.fillRect(6, 10, 2, 1);
    ctx.fillRect(16, 11, 2, 1);
    return c;
  })();
  const macaron = (() => {
    const { c, ctx } = canvas(22, 16);
    ctx.fillStyle = "#ff7ec8";
    ctx.fillRect(3, 2, 16, 5);
    ctx.fillStyle = "#fff5fb";
    ctx.fillRect(4, 7, 14, 3);
    ctx.fillStyle = "#ff2ea6";
    ctx.fillRect(3, 10, 16, 5);
    ctx.fillStyle = "#7df9ff";
    ctx.fillRect(5, 3, 3, 1);
    return c;
  })();
  const croissant = (() => {
    const { c, ctx } = canvas(28, 16);
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(2, 6, 24, 6);
    ctx.fillStyle = "#ffc050";
    ctx.fillRect(4, 4, 8, 4);
    ctx.fillRect(16, 8, 8, 4);
    ctx.fillStyle = "#ff6ec7";
    ctx.fillRect(10, 5, 2, 1);
    ctx.fillRect(18, 9, 2, 1);
    return c;
  })();
  const donut = (() => {
    const { c, ctx } = canvas(22, 22);
    ctx.fillStyle = "#ff6ec7";
    ctx.fillRect(3, 3, 16, 16);
    ctx.fillStyle = "#000000";
    ctx.fillRect(8, 8, 6, 6);
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(5, 5, 2, 2);
    ctx.fillRect(14, 6, 2, 2);
    ctx.fillStyle = "#00e8ff";
    ctx.fillRect(6, 14, 2, 2);
    ctx.fillRect(13, 13, 2, 2);
    return c;
  })();
  const slice = (() => {
    const { c, ctx } = canvas(22, 22);
    ctx.fillStyle = "#ffe8c8";
    ctx.beginPath();
    ctx.moveTo(11, 2);
    ctx.lineTo(20, 18);
    ctx.lineTo(2, 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ff6ec7";
    ctx.fillRect(4, 10, 14, 3);
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(10, 3, 3, 3);
    return c;
  })();
  return [cupcake, macaron, croissant, donut, slice];
}

export function bakeCakeSet() {
  return {
    sky: bakeCakeSky(),
    mountains: bakeCakeMountains(),
    midscape: bakeCakeMidscape(),
    cloud: bakeCakeCloud(),
    pastries: bakePastrySet(),
    foreground: bakeCakeForeground(),
  };
}

/** Tesla Works sky - soft silver-blue -> white factory dawn */
export function bakeTeslaSky(w = 480, h = 270) {
  const { c, ctx } = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#8aa8c8");
  g.addColorStop(0.28, "#b8c8d8");
  g.addColorStop(0.55, "#dce6f0");
  g.addColorStop(0.78, "#eef2f6");
  g.addColorStop(1, "#f7f9fb");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Soft factory-haze bands
  for (const [x, y, cw, ch] of [
    [40, 40, 90, 10],
    [180, 55, 110, 12],
    [320, 35, 80, 9],
  ]) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = "rgba(62, 106, 225, 0.08)";
    ctx.fillRect(x + 10, y + 2, cw * 0.45, 3);
  }
  const haze = ctx.createLinearGradient(0, h * 0.62, 0, h);
  haze.addColorStop(0, "rgba(168, 192, 208, 0)");
  haze.addColorStop(1, "rgba(200, 210, 220, 0.35)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
  return c;
}

/** Distant Gigafactory roof ridge */
export function bakeTeslaFactoryFar(w = 480, h = 110) {
  const { c, ctx } = canvas(w, h);
  const tiers = [
    ["#a8b4c0", 0.58],
    ["#c0cad4", 0.72],
    ["#d8e0e8", 0.88],
  ];
  for (const [col, base] of tiers) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, h);
    let x = 0;
    while (x <= w) {
      const peak = h * base - ((x * 11) % 18) - Math.sin(x * 0.025) * 6;
      ctx.lineTo(x, peak);
      x += 14;
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
  // Solar strip + blue window glow
  ctx.fillStyle = "#3E6AE1";
  for (let x = 20; x < w; x += 52) {
    ctx.fillRect(x, Math.floor(h * 0.55), 18, 2);
    ctx.fillRect(x + 4, Math.floor(h * 0.7), 3, 8);
  }
  ctx.fillStyle = "#E82127";
  for (let x = 36; x < w; x += 64) {
    ctx.fillRect(x, Math.floor(h * 0.48), 2, 2);
  }
  ctx.fillStyle = "#A8C0D0";
  ctx.fillRect(0, h - 3, w, 2);
  return c;
}

/** Mid factory halls / charging pods */
export function bakeTeslaMidscape(w = 480, h = 140) {
  const { c, ctx } = canvas(w, h);
  const halls = [
    [8, 55, 100, 75, "#d0d8e0"],
    [120, 40, 120, 90, "#c8d2dc"],
    [260, 50, 100, 80, "#d4dce4"],
    [375, 35, 95, 95, "#c4ced8"],
  ];
  for (const [x, y, cw, ch, body] of halls) {
    ctx.fillStyle = body;
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = "#eef2f6";
    ctx.fillRect(x, y, cw, 6);
    ctx.fillStyle = "#3E6AE1";
    ctx.fillRect(x + 6, y + 14, cw - 12, 3);
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + 10 + i * ((cw - 20) / 4), y + 28, 6, ch - 40);
    }
    ctx.fillStyle = "#E82127";
    ctx.fillRect(x + cw * 0.45, y - 4, 3, 4);
  }
  // Charging pod silhouettes
  ctx.fillStyle = "#9aabba";
  for (let i = 0; i < 4; i++) {
    const x = 50 + i * 110;
    ctx.fillRect(x, 95, 22, 30);
    ctx.fillStyle = "#3E6AE1";
    ctx.fillRect(x + 4, 100, 14, 2);
    ctx.fillStyle = "#9aabba";
  }
  return c;
}

/** Soft factory steam puff */
export function bakeTeslaSteam(w = 64, h = 28) {
  const { c, ctx } = canvas(w, h);
  const blobs = [
    [8, 12, 22, 12],
    [22, 6, 28, 14],
    [40, 10, 18, 11],
  ];
  for (const [x, y, cw, ch] of blobs) {
    ctx.fillStyle = "rgba(240, 246, 252, 0.92)";
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = "rgba(168, 192, 208, 0.5)";
    ctx.fillRect(x + 2, y + ch - 4, cw - 4, 3);
    ctx.fillStyle = "rgba(62, 106, 225, 0.35)";
    ctx.fillRect(x + 4, y + 1, Math.max(4, cw * 0.35), 2);
  }
  return c;
}

/** Foreground cable / conduit accents */
export function bakeTeslaForeground(w = 480, h = 80) {
  const { c, ctx } = canvas(w, h);
  for (let x = 0; x < w; x += 22) {
    const len = 8 + ((x * 5) % 18);
    ctx.fillStyle = "#9aa8b4";
    ctx.fillRect(x + 6, 0, 4, len);
    ctx.fillStyle = "#3E6AE1";
    ctx.fillRect(x + 7, len - 2, 2, 2);
    if (x % 66 === 0) {
      ctx.fillStyle = "#E82127";
      ctx.fillRect(x + 7, Math.max(2, len - 6), 2, 2);
    }
  }
  ctx.fillStyle = "#b0bac4";
  ctx.fillRect(0, h - 14, w, 14);
  ctx.fillStyle = "#3E6AE1";
  ctx.fillRect(0, h - 16, w, 2);
  ctx.fillStyle = "#E82127";
  for (let x = 12; x < w; x += 36) ctx.fillRect(x, h - 10, 2, 2);
  return c;
}

/** Procedural Tesla vehicle floaters (Imagine fallback) */
export function bakeTeslaVehicleSet() {
  const sedan = (() => {
    const { c, ctx } = canvas(28, 14);
    ctx.fillStyle = "#E8EEF4";
    ctx.fillRect(2, 6, 24, 5);
    ctx.fillStyle = "#C8D0D8";
    ctx.fillRect(8, 3, 12, 4);
    ctx.fillStyle = "#3E6AE1";
    ctx.fillRect(24, 7, 3, 2);
    ctx.fillStyle = "#E82127";
    ctx.fillRect(2, 7, 2, 2);
    ctx.fillStyle = "#A8C0D0";
    ctx.fillRect(6, 11, 4, 2);
    ctx.fillRect(18, 11, 4, 2);
    return c;
  })();
  const cyber = (() => {
    const { c, ctx } = canvas(30, 14);
    ctx.fillStyle = "#D8DEE6";
    ctx.beginPath();
    ctx.moveTo(2, 10);
    ctx.lineTo(8, 3);
    ctx.lineTo(28, 5);
    ctx.lineTo(28, 11);
    ctx.lineTo(2, 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3E6AE1";
    ctx.fillRect(26, 6, 3, 2);
    ctx.fillStyle = "#E82127";
    ctx.fillRect(2, 8, 2, 2);
    ctx.fillStyle = "#9aa8b4";
    ctx.fillRect(8, 11, 5, 2);
    ctx.fillRect(20, 11, 5, 2);
    return c;
  })();
  const roadster = (() => {
    const { c, ctx } = canvas(28, 12);
    ctx.fillStyle = "#E82127";
    ctx.fillRect(3, 5, 22, 4);
    ctx.fillStyle = "#C03038";
    ctx.fillRect(9, 2, 11, 4);
    ctx.fillStyle = "#3E6AE1";
    ctx.fillRect(23, 6, 3, 2);
    ctx.fillStyle = "#F5F7FA";
    ctx.fillRect(10, 3, 4, 2);
    ctx.fillStyle = "#A8C0D0";
    ctx.fillRect(6, 9, 4, 2);
    ctx.fillRect(17, 9, 4, 2);
    return c;
  })();
  const suv = (() => {
    const { c, ctx } = canvas(28, 16);
    ctx.fillStyle = "#F5F7FA";
    ctx.fillRect(2, 6, 24, 7);
    ctx.fillStyle = "#E8EEF4";
    ctx.fillRect(7, 2, 14, 5);
    ctx.fillStyle = "#3E6AE1";
    ctx.fillRect(24, 8, 3, 2);
    ctx.fillStyle = "#E82127";
    ctx.fillRect(2, 8, 2, 2);
    ctx.fillStyle = "#A8C0D0";
    ctx.fillRect(6, 13, 4, 2);
    ctx.fillRect(18, 13, 4, 2);
    return c;
  })();
  return [sedan, cyber, roadster, suv];
}

export function bakeTeslaSet() {
  return {
    sky: bakeTeslaSky(),
    factory: bakeTeslaFactoryFar(),
    midscape: bakeTeslaMidscape(),
    steam: bakeTeslaSteam(),
    vehicles: bakeTeslaVehicleSet(),
    foreground: bakeTeslaForeground(),
  };
}

/** Boring Company - lit tunnel vault (amber + cyan construction lights) */
export function bakeBoringSky(w = 480, h = 270) {
  const { c, ctx } = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#3a4650");
  g.addColorStop(0.28, "#4a5864");
  g.addColorStop(0.55, "#5c6a74");
  g.addColorStop(0.78, "#6e7c86");
  g.addColorStop(1, "#7a8890");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Soft tunnel-mouth glow bands
  for (const [x, y, cw, ch] of [
    [50, 36, 100, 10],
    [200, 48, 120, 12],
    [340, 30, 90, 9],
  ]) {
    ctx.fillStyle = "rgba(255, 196, 120, 0.22)";
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = "rgba(90, 200, 210, 0.14)";
    ctx.fillRect(x + 12, y + 2, cw * 0.4, 3);
  }
  const haze = ctx.createLinearGradient(0, h * 0.58, 0, h);
  haze.addColorStop(0, "rgba(120, 140, 150, 0)");
  haze.addColorStop(1, "rgba(160, 140, 100, 0.28)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.58, w, h * 0.42);
  return c;
}

/** Distant tunnel rings / ribbed bore - pale white concrete */
export function bakeBoringTunnelFar(w = 480, h = 110) {
  const { c, ctx } = canvas(w, h);
  const tiers = [
    ["#d8e0e6", 0.52],
    ["#e2e8ec", 0.68],
    ["#eef2f4", 0.86],
  ];
  for (const [col, base] of tiers) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, h);
    let x = 0;
    while (x <= w) {
      const peak = h * base - ((x * 9) % 14) - Math.sin(x * 0.03) * 5;
      ctx.lineTo(x, peak);
      x += 12;
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
  // Construction light accents
  ctx.fillStyle = "#E8A84A";
  for (let x = 18; x < w; x += 48) {
    ctx.fillRect(x, Math.floor(h * 0.5), 3, 2);
  }
  ctx.fillStyle = "#5AC8D2";
  for (let x = 40; x < w; x += 56) {
    ctx.fillRect(x, Math.floor(h * 0.62), 2, 6);
  }
  ctx.fillStyle = "#c4ccd2";
  ctx.fillRect(0, h - 3, w, 2);
  return c;
}

/** Mid tunnel - road + ribbed bore vanishing toward horizon */
export function bakeBoringMidscape(w = 480, h = 140) {
  const { c, ctx } = canvas(w, h);
  // Asphalt road band (horizon traffic lane)
  ctx.fillStyle = "#3a4248";
  ctx.fillRect(0, 78, w, 62);
  ctx.fillStyle = "#2e3438";
  ctx.fillRect(0, 78, w, 4);
  // Dashed center line
  ctx.fillStyle = "#E8A84A";
  for (let x = 8; x < w; x += 28) ctx.fillRect(x, 108, 14, 2);
  // Receding rib arches - pale concrete rings
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const x = Math.floor(20 + t * 50);
    const aw = Math.floor(w - 40 - t * 90);
    const y = Math.floor(8 + t * 28);
    const ah = Math.floor(70 - t * 22);
    ctx.strokeStyle = `rgba(210, 220, 228, ${0.7 - t * 0.35})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(w / 2, y + ah, aw / 2, ah * 0.55, 0, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = "#E8A84A";
    ctx.globalAlpha = 0.45;
    ctx.fillRect(x + 10, y + ah - 8, 3, 3);
    ctx.fillRect(x + aw - 14, y + ah - 8, 3, 3);
    ctx.globalAlpha = 1;
  }
  // Cyan vanishing haze
  const haze = ctx.createRadialGradient(w / 2, 40, 4, w / 2, 40, 90);
  haze.addColorStop(0, "rgba(90, 200, 210, 0.35)");
  haze.addColorStop(1, "rgba(90, 200, 210, 0)");
  ctx.fillStyle = haze;
  ctx.fillRect(w / 2 - 100, 0, 200, 80);
  return c;
}

/**
 * Giant tunnel boring machine for distant background.
 * Frontal cutter face + shield body; cutter spokes animate at runtime.
 */
export function bakeBoringDrill(w = 320, h = 240) {
  const { c, ctx } = canvas(w, h);
  const cx = Math.floor(w * 0.58);
  const cy = Math.floor(h * 0.48);
  const r = Math.floor(Math.min(w, h) * 0.34);

  // Trailing shield / body into the bore (left of cutter)
  const bodyGrad = ctx.createLinearGradient(20, cy - 40, cx - 10, cy + 50);
  bodyGrad.addColorStop(0, "#d8e0e6");
  bodyGrad.addColorStop(0.55, "#c4ced6");
  bodyGrad.addColorStop(1, "#aeb8c0");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(18, cy - 28);
  ctx.lineTo(cx - r * 0.55, cy - r * 0.72);
  ctx.lineTo(cx - r * 0.4, cy + r * 0.78);
  ctx.lineTo(22, cy + 42);
  ctx.closePath();
  ctx.fill();
  // Body ribs
  ctx.strokeStyle = "rgba(150, 162, 172, 0.55)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const x0 = 28 + t * (cx - r * 0.7 - 28);
    ctx.beginPath();
    ctx.moveTo(x0, cy - 24 + t * 6);
    ctx.lineTo(x0 + 8, cy + 34 - t * 4);
    ctx.stroke();
  }
  // Service gantry / conveyor hump
  ctx.fillStyle = "#b8c4cc";
  ctx.fillRect(36, cy - 52, 70, 18);
  ctx.fillStyle = "#E8A84A";
  ctx.fillRect(40, cy - 54, 8, 3);
  ctx.fillRect(88, cy - 54, 8, 3);
  ctx.fillStyle = "#5AC8D2";
  ctx.fillRect(62, cy - 56, 14, 3);

  // Outer shield ring
  ctx.beginPath();
  ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
  ctx.fillStyle = "#e8eef2";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.fillStyle = "#c8d2da";
  ctx.fill();

  // Cutter face disc
  const face = ctx.createRadialGradient(cx - 8, cy - 10, 4, cx, cy, r);
  face.addColorStop(0, "#9aa6b0");
  face.addColorStop(0.55, "#7a8690");
  face.addColorStop(1, "#5a6670");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = face;
  ctx.fill();

  // Static tooth ring (spokes drawn rotating at runtime)
  ctx.strokeStyle = "#4a545c";
  ctx.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * (r - 6);
    const y1 = cy + Math.sin(a) * (r - 6);
    const x2 = cx + Math.cos(a) * (r + 2);
    const y2 = cy + Math.sin(a) * (r + 2);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  // Hub
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = "#d0d8de";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = "#5AC8D2";
  ctx.fill();

  // Amber work lights around rim
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const lx = cx + Math.cos(a) * (r + 6);
    const ly = cy + Math.sin(a) * (r + 6);
    ctx.fillStyle = i % 2 === 0 ? "#E8A84A" : "#5AC8D2";
    ctx.fillRect(Math.floor(lx - 2), Math.floor(ly - 2), 4, 4);
  }

  // Soft dust haze at base
  const dust = ctx.createRadialGradient(cx, cy + r * 0.6, 4, cx, cy + r * 0.7, r * 0.9);
  dust.addColorStop(0, "rgba(200, 190, 170, 0.35)");
  dust.addColorStop(1, "rgba(200, 190, 170, 0)");
  ctx.fillStyle = dust;
  ctx.fillRect(cx - r, cy, r * 2, r);

  return c;
}

/** Procedural Boring Loop cars (Imagine fallback) - face right; runtime scrolls left (no flip) */
export function bakeBoringVehicleSet() {
  const sedan = (() => {
    const { c, ctx } = canvas(30, 14);
    ctx.fillStyle = "#E8EEF4";
    ctx.fillRect(2, 6, 24, 5);
    ctx.fillStyle = "#C8D0D8";
    ctx.fillRect(8, 3, 12, 4);
    ctx.fillStyle = "#E8A84A";
    ctx.fillRect(24, 7, 4, 2);
    ctx.fillStyle = "#5AC8D2";
    ctx.fillRect(2, 7, 2, 2);
    ctx.fillStyle = "#6a7680";
    ctx.fillRect(6, 11, 4, 2);
    ctx.fillRect(18, 11, 4, 2);
    return c;
  })();
  const cyber = (() => {
    const { c, ctx } = canvas(32, 14);
    ctx.fillStyle = "#D8DEE6";
    ctx.beginPath();
    ctx.moveTo(2, 10);
    ctx.lineTo(8, 3);
    ctx.lineTo(30, 5);
    ctx.lineTo(30, 11);
    ctx.lineTo(2, 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#E8A84A";
    ctx.fillRect(28, 6, 3, 2);
    ctx.fillStyle = "#5AC8D2";
    ctx.fillRect(2, 8, 2, 2);
    ctx.fillStyle = "#6a7680";
    ctx.fillRect(8, 11, 5, 2);
    ctx.fillRect(20, 11, 5, 2);
    return c;
  })();
  const pod = (() => {
    const { c, ctx } = canvas(26, 14);
    ctx.fillStyle = "#F0F4F8";
    ctx.beginPath();
    ctx.ellipse(13, 8, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#E8A84A";
    ctx.fillRect(20, 7, 4, 2);
    ctx.fillStyle = "#5AC8D2";
    ctx.fillRect(6, 5, 8, 2);
    ctx.fillStyle = "#6a7680";
    ctx.fillRect(6, 11, 4, 2);
    ctx.fillRect(14, 11, 4, 2);
    return c;
  })();
  const roadster = (() => {
    const { c, ctx } = canvas(28, 12);
    ctx.fillStyle = "#E05050";
    ctx.fillRect(3, 5, 22, 4);
    ctx.fillStyle = "#C03840";
    ctx.fillRect(9, 2, 11, 4);
    ctx.fillStyle = "#E8A84A";
    ctx.fillRect(23, 6, 3, 2);
    ctx.fillStyle = "#5AC8D2";
    ctx.fillRect(3, 6, 2, 2);
    ctx.fillStyle = "#6a7680";
    ctx.fillRect(6, 9, 4, 2);
    ctx.fillRect(17, 9, 4, 2);
    return c;
  })();
  return [sedan, cyber, pod, roadster];
}

/** Foreground tunnel struts / conduit accents */
export function bakeBoringForeground(w = 480, h = 80) {
  const { c, ctx } = canvas(w, h);
  for (let x = 0; x < w; x += 20) {
    const len = 10 + ((x * 7) % 20);
    ctx.fillStyle = "#5a6670";
    ctx.fillRect(x + 5, 0, 5, len);
    ctx.fillStyle = "#E8A84A";
    ctx.fillRect(x + 6, len - 2, 3, 2);
    if (x % 60 === 0) {
      ctx.fillStyle = "#5AC8D2";
      ctx.fillRect(x + 6, Math.max(2, len - 7), 3, 2);
    }
  }
  ctx.fillStyle = "#6a7680";
  ctx.fillRect(0, h - 16, w, 16);
  ctx.fillStyle = "#E8A84A";
  ctx.fillRect(0, h - 18, w, 2);
  ctx.fillStyle = "#5AC8D2";
  for (let x = 14; x < w; x += 32) ctx.fillRect(x, h - 10, 2, 2);
  return c;
}

/** Procedural giant rock floaters (Imagine fallback) */
export function bakeBoringRockSet() {
  const boulder = (() => {
    const { c, ctx } = canvas(28, 22);
    ctx.fillStyle = "#8B7355";
    ctx.beginPath();
    ctx.moveTo(4, 16);
    ctx.lineTo(8, 6);
    ctx.lineTo(18, 4);
    ctx.lineTo(26, 12);
    ctx.lineTo(22, 20);
    ctx.lineTo(6, 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#5A8A82";
    ctx.fillRect(10, 8, 8, 5);
    ctx.fillStyle = "#C4A06A";
    ctx.fillRect(14, 6, 4, 3);
    return c;
  })();
  const slab = (() => {
    const { c, ctx } = canvas(30, 18);
    ctx.fillStyle = "#7A6A58";
    ctx.fillRect(3, 5, 24, 11);
    ctx.fillStyle = "#9A8870";
    ctx.fillRect(6, 3, 16, 5);
    ctx.fillStyle = "#5AC8D2";
    ctx.fillRect(20, 8, 4, 2);
    ctx.fillStyle = "#E8A84A";
    ctx.fillRect(5, 10, 3, 2);
    return c;
  })();
  const jagged = (() => {
    const { c, ctx } = canvas(26, 24);
    ctx.fillStyle = "#6E8078";
    ctx.beginPath();
    ctx.moveTo(3, 18);
    ctx.lineTo(6, 8);
    ctx.lineTo(12, 3);
    ctx.lineTo(20, 7);
    ctx.lineTo(24, 16);
    ctx.lineTo(18, 22);
    ctx.lineTo(5, 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#8B7355";
    ctx.fillRect(10, 10, 7, 6);
    ctx.fillStyle = "#C4A06A";
    ctx.fillRect(12, 6, 3, 3);
    return c;
  })();
  const round = (() => {
    const { c, ctx } = canvas(24, 20);
    ctx.fillStyle = "#8A7860";
    ctx.beginPath();
    ctx.ellipse(12, 11, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5A8A82";
    ctx.beginPath();
    ctx.ellipse(10, 9, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#E8A84A";
    ctx.fillRect(14, 8, 3, 2);
    return c;
  })();
  return [boulder, slab, jagged, round];
}

export function bakeBoringSet() {
  return {
    sky: bakeBoringSky(),
    tunnel: bakeBoringTunnelFar(),
    midscape: bakeBoringMidscape(),
    rocks: bakeBoringRockSet(),
    vehicles: bakeBoringVehicleSet(),
    drill: bakeBoringDrill(),
    foreground: bakeBoringForeground(),
  };
}

/** Neuralink - sterile OR vault (teal + cyan surgical lights) */
export function bakeNeuralinkSky(w = 480, h = 270) {
  const { c, ctx } = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#b8ccd4");
  g.addColorStop(0.28, "#d0e0e6");
  g.addColorStop(0.55, "#e4eef2");
  g.addColorStop(0.78, "#eef5f7");
  g.addColorStop(1, "#f6fafb");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (const [x, y, cw, ch] of [
    [60, 28, 90, 10],
    [210, 40, 110, 12],
    [350, 24, 80, 9],
  ]) {
    ctx.fillStyle = "rgba(125, 223, 232, 0.28)";
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = "rgba(77, 182, 172, 0.18)";
    ctx.fillRect(x + 12, y + 2, cw * 0.4, 3);
  }
  const haze = ctx.createLinearGradient(0, h * 0.58, 0, h);
  haze.addColorStop(0, "rgba(180, 200, 205, 0)");
  haze.addColorStop(1, "rgba(160, 180, 185, 0.22)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.58, w, h * 0.42);
  return c;
}

/** Distant OR equipment / monitor banks */
export function bakeNeuralinkOrFar(w = 480, h = 110) {
  const { c, ctx } = canvas(w, h);
  const tiers = [
    ["#c8d4d8", 0.52],
    ["#d4dee2", 0.68],
    ["#e0e8ec", 0.86],
  ];
  for (const [col, base] of tiers) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, h);
    let x = 0;
    while (x <= w) {
      const peak = h * base - ((x * 9) % 12) - Math.sin(x * 0.028) * 4;
      ctx.lineTo(x, peak);
      x += 12;
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#4DB6AC";
  for (let x = 18; x < w; x += 48) {
    ctx.fillRect(x, Math.floor(h * 0.5), 3, 2);
  }
  ctx.fillStyle = "#7DDFE8";
  for (let x = 40; x < w; x += 56) {
    ctx.fillRect(x, Math.floor(h * 0.62), 2, 6);
  }
  ctx.fillStyle = "#a8b4b8";
  ctx.fillRect(0, h - 3, w, 2);
  return c;
}

/** Mid OR walls / beds / consoles */
export function bakeNeuralinkMidscape(w = 480, h = 140) {
  const { c, ctx } = canvas(w, h);
  const bays = [
    [6, 40, 105, 90, "#d0dce0"],
    [118, 30, 115, 100, "#c8d6da"],
    [250, 45, 110, 85, "#d6e2e6"],
    [370, 28, 100, 102, "#ccd8dc"],
  ];
  for (const [x, y, cw, ch, body] of bays) {
    ctx.fillStyle = body;
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = "#e8f0f4";
    ctx.fillRect(x, y, cw, 5);
    ctx.fillStyle = "#4DB6AC";
    ctx.fillRect(x + 8, y + 16, cw - 16, 2);
    ctx.fillStyle = "#7DDFE8";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + 14 + i * ((cw - 28) / 3), y + 28, 4, ch - 44);
    }
    ctx.fillStyle = "#2A2F36";
    ctx.fillRect(x + cw * 0.42, y - 3, 4, 3);
  }
  ctx.fillStyle = "#E8B4B8";
  for (let i = 0; i < 5; i++) {
    const x = 30 + i * 95;
    ctx.fillRect(x, 108, 22, 14);
    ctx.fillStyle = "#4DB6AC";
    ctx.fillRect(x + 6, 104, 10, 6);
    ctx.fillStyle = "#E8B4B8";
  }
  return c;
}

/** Foreground OR light fixtures / conduit accents */
export function bakeNeuralinkForeground(w = 480, h = 80) {
  const { c, ctx } = canvas(w, h);
  for (let x = 0; x < w; x += 20) {
    const len = 10 + ((x * 7) % 20);
    ctx.fillStyle = "#a8b4b8";
    ctx.fillRect(x + 5, 0, 5, len);
    ctx.fillStyle = "#7DDFE8";
    ctx.fillRect(x + 6, len - 2, 3, 2);
    if (x % 60 === 0) {
      ctx.fillStyle = "#4DB6AC";
      ctx.fillRect(x + 6, Math.max(2, len - 7), 3, 2);
    }
  }
  ctx.fillStyle = "#c0ccd0";
  ctx.fillRect(0, h - 16, w, 16);
  ctx.fillStyle = "#4DB6AC";
  ctx.fillRect(0, h - 18, w, 2);
  ctx.fillStyle = "#7DDFE8";
  for (let x = 14; x < w; x += 32) ctx.fillRect(x, h - 10, 2, 2);
  return c;
}

/** Procedural floating brain floaters (Imagine fallback) */
export function bakeNeuralinkBrainSet() {
  const a = (() => {
    const { c, ctx } = canvas(28, 22);
    ctx.fillStyle = "#E8B4B8";
    ctx.beginPath();
    ctx.ellipse(14, 12, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d4989c";
    ctx.fillRect(8, 8, 12, 3);
    ctx.fillStyle = "#7DDFE8";
    ctx.fillRect(10, 10, 2, 6);
    ctx.fillRect(16, 9, 2, 7);
    return c;
  })();
  const b = (() => {
    const { c, ctx } = canvas(26, 24);
    ctx.fillStyle = "#E8B4B8";
    ctx.beginPath();
    ctx.ellipse(13, 14, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2A2F36";
    ctx.fillRect(9, 6, 8, 4);
    ctx.fillStyle = "#4DB6AC";
    ctx.fillRect(10, 7, 6, 2);
    ctx.fillStyle = "#7DDFE8";
    ctx.fillRect(12, 14, 2, 6);
    return c;
  })();
  const cBrain = (() => {
    const { c, ctx } = canvas(24, 22);
    ctx.fillStyle = "#d8a8c0";
    ctx.beginPath();
    ctx.ellipse(12, 12, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7DDFE8";
    ctx.fillRect(6, 10, 12, 1);
    ctx.fillRect(8, 13, 8, 1);
    ctx.fillStyle = "#E8A84A";
    ctx.fillRect(14, 8, 2, 2);
    return c;
  })();
  const d = (() => {
    const { c, ctx } = canvas(24, 20);
    ctx.fillStyle = "#E8C0B0";
    ctx.beginPath();
    ctx.ellipse(12, 11, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4DB6AC";
    ctx.beginPath();
    ctx.ellipse(10, 9, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#E8A84A";
    ctx.fillRect(14, 8, 3, 2);
    return c;
  })();
  return [a, b, cBrain, d];
}

export function bakeNeuralinkSet() {
  return {
    sky: bakeNeuralinkSky(),
    orFar: bakeNeuralinkOrFar(),
    midscape: bakeNeuralinkMidscape(),
    brains: bakeNeuralinkBrainSet(),
    foreground: bakeNeuralinkForeground(),
  };
}

/** Soft deep navy Starbase night sky with cool nebulas */
export function bakeSpaceXSky(w = 480, h = 270) {
  const { c, ctx } = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0B1D36");
  g.addColorStop(0.45, "#1A3A4A");
  g.addColorStop(0.78, "#2A4A5C");
  g.addColorStop(1, "#3A5A68");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Soft nebula washes (cyan / violet / ember)
  const nebulas = [
    [0.18, 0.22, 90, "rgba(91, 192, 235, 0.22)", "rgba(120, 80, 160, 0.16)"],
    [0.62, 0.16, 110, "rgba(160, 90, 180, 0.18)", "rgba(91, 192, 235, 0.14)"],
    [0.4, 0.38, 80, "rgba(255, 107, 44, 0.1)", "rgba(91, 192, 235, 0.12)"],
    [0.82, 0.28, 70, "rgba(91, 192, 235, 0.16)", "rgba(26, 58, 74, 0.2)"],
  ];
  for (const [nx, ny, r, c1, c2] of nebulas) {
    const cx = w * nx;
    const cy = h * ny;
    const ng = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    ng.addColorStop(0, c1);
    ng.addColorStop(0.55, c2);
    ng.addColorStop(1, "rgba(11, 29, 54, 0)");
    ctx.fillStyle = ng;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.fillStyle = "rgba(232, 238, 244, 0.85)";
  for (let i = 0; i < 56; i++) {
    const x = (i * 97 + 13) % w;
    const y = (i * 53 + 7) % Math.floor(h * 0.55);
    const s = 1 + (i % 3 === 0 ? 1 : 0);
    ctx.fillRect(x, y, s, s);
  }
  const haze = ctx.createLinearGradient(0, h * 0.55, 0, h);
  haze.addColorStop(0, "rgba(91, 192, 235, 0)");
  haze.addColorStop(1, "rgba(168, 192, 208, 0.22)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
  return c;
}

/** Distant launch towers / gantries */
export function bakeSpaceXPadFar(w = 480, h = 110) {
  const { c, ctx } = canvas(w, h);
  const towers = [
    [20, 18, 14, 80],
    [70, 30, 22, 68],
    [140, 12, 16, 88],
    [210, 40, 40, 58],
    [290, 20, 18, 78],
    [360, 28, 28, 70],
    [430, 16, 14, 82],
  ];
  for (const [x, y, tw, th] of towers) {
    ctx.fillStyle = "#1A2A3A";
    ctx.fillRect(x, y, tw, th);
    ctx.fillStyle = "#A8B4C0";
    ctx.fillRect(x, y, tw, 3);
    ctx.fillStyle = "#5BC0EB";
    ctx.fillRect(x + 2, y + 10, 2, 8);
    if (tw > 16) {
      ctx.fillStyle = "#FF6B2C";
      ctx.fillRect(x + tw - 4, y + 6, 2, 2);
    }
  }
  ctx.fillStyle = "#2A3A48";
  ctx.fillRect(0, h - 8, w, 8);
  return c;
}

/** Mid launch pad halls */
export function bakeSpaceXMidscape(w = 480, h = 140) {
  const { c, ctx } = canvas(w, h);
  const halls = [
    [6, 50, 90, 80, "#3A4A58"],
    [110, 35, 110, 95, "#2E3E4C"],
    [240, 45, 100, 85, "#364858"],
    [360, 30, 105, 100, "#2A3A48"],
  ];
  for (const [x, y, cw, ch, body] of halls) {
    ctx.fillStyle = body;
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = "#C8D4E0";
    ctx.fillRect(x, y, cw, 5);
    ctx.fillStyle = "#5BC0EB";
    ctx.fillRect(x + 6, y + 14, cw - 12, 2);
    ctx.fillStyle = "#FF6B2C";
    ctx.fillRect(x + cw * 0.5, y - 3, 2, 3);
  }
  ctx.fillStyle = "#C4B49A";
  ctx.fillRect(0, h - 18, w, 18);
  return c;
}

/** Procedural cartoon rocket floaters - cake-pastry chunky pixel fallback */
export function bakeSpaceXRocketSet() {
  const falcon = (() => {
    const { c, ctx } = canvas(16, 32);
    // Body + outline (pastry-style chunky pixels)
    ctx.fillStyle = "#1A1A22";
    ctx.fillRect(4, 1, 8, 20);
    ctx.fillStyle = "#F5F7FA";
    ctx.fillRect(5, 2, 6, 18);
    ctx.fillStyle = "#C8D4E0";
    ctx.fillRect(9, 3, 2, 16);
    ctx.fillStyle = "#1A2A3A";
    ctx.fillRect(5, 10, 6, 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(6, 3, 1, 3);
    // Cartoon flame plume
    ctx.fillStyle = "#FF6B2C";
    ctx.fillRect(4, 21, 8, 6);
    ctx.fillStyle = "#FFE066";
    ctx.fillRect(6, 21, 4, 7);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(7, 22, 2, 3);
    ctx.fillStyle = "#5BC0EB";
    ctx.fillRect(5, 27, 1, 1);
    ctx.fillRect(10, 28, 1, 1);
    return c;
  })();
  const starship = (() => {
    const { c, ctx } = canvas(18, 34);
    ctx.fillStyle = "#1A1A22";
    ctx.fillRect(5, 1, 8, 22);
    ctx.fillStyle = "#D0D8E0";
    ctx.fillRect(6, 2, 6, 20);
    // Nose cone
    ctx.fillStyle = "#E8EEF4";
    ctx.fillRect(7, 1, 4, 3);
    ctx.fillRect(8, 0, 2, 2);
    // Forward flaps + aft flaps
    ctx.fillStyle = "#A8B4C0";
    ctx.fillRect(3, 6, 2, 3);
    ctx.fillRect(13, 6, 2, 3);
    ctx.fillRect(3, 18, 2, 4);
    ctx.fillRect(13, 18, 2, 4);
    ctx.fillStyle = "#1A2A3A";
    ctx.fillRect(6, 14, 3, 8);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(7, 3, 1, 3);
    ctx.fillStyle = "#FF6B2C";
    ctx.fillRect(4, 23, 10, 5);
    ctx.fillStyle = "#FFE066";
    ctx.fillRect(6, 23, 6, 6);
    ctx.fillStyle = "#5BC0EB";
    ctx.fillRect(7, 29, 4, 3);
    return c;
  })();
  const starshipB = (() => {
    const { c, ctx } = canvas(16, 36);
    ctx.fillStyle = "#1A1A22";
    ctx.fillRect(4, 1, 8, 24);
    ctx.fillStyle = "#C8D4E0";
    ctx.fillRect(5, 2, 6, 22);
    ctx.fillStyle = "#F5F7FA";
    ctx.fillRect(6, 1, 4, 3);
    ctx.fillRect(7, 0, 2, 2);
    ctx.fillStyle = "#8A96A4";
    ctx.fillRect(2, 8, 2, 2);
    ctx.fillRect(12, 8, 2, 2);
    ctx.fillRect(2, 20, 2, 4);
    ctx.fillRect(12, 20, 2, 4);
    ctx.fillStyle = "#2A3440";
    ctx.fillRect(5, 16, 2, 8);
    ctx.fillStyle = "#FF6B2C";
    ctx.fillRect(3, 25, 10, 5);
    ctx.fillStyle = "#FFE066";
    ctx.fillRect(5, 25, 6, 6);
    ctx.fillStyle = "#5BC0EB";
    ctx.fillRect(6, 31, 4, 3);
    return c;
  })();
  const starshipC = (() => {
    const { c, ctx } = canvas(17, 32);
    ctx.fillStyle = "#B8C4D0";
    ctx.fillRect(5, 2, 7, 20);
    ctx.fillStyle = "#E8EEF4";
    ctx.fillRect(6, 1, 5, 3);
    ctx.fillRect(7, 0, 3, 2);
    ctx.fillStyle = "#1A2A3A";
    ctx.fillRect(7, 12, 3, 8);
    ctx.fillStyle = "#9AA8B4";
    ctx.fillRect(3, 7, 2, 2);
    ctx.fillRect(12, 7, 2, 2);
    ctx.fillRect(3, 18, 2, 3);
    ctx.fillRect(12, 18, 2, 3);
    ctx.fillStyle = "#FF6B2C";
    ctx.fillRect(4, 22, 9, 5);
    ctx.fillStyle = "#FFE066";
    ctx.fillRect(6, 22, 5, 6);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(7, 23, 3, 3);
    ctx.fillStyle = "#5BC0EB";
    ctx.fillRect(5, 28, 1, 1);
    ctx.fillRect(11, 29, 1, 1);
    return c;
  })();
  const starshipStack = (() => {
    const { c, ctx } = canvas(20, 38);
    // Starship upper
    ctx.fillStyle = "#D0D8E0";
    ctx.fillRect(7, 1, 6, 12);
    ctx.fillStyle = "#F5F7FA";
    ctx.fillRect(8, 0, 4, 3);
    ctx.fillStyle = "#A8B4C0";
    ctx.fillRect(5, 8, 2, 3);
    ctx.fillRect(13, 8, 2, 3);
    // Super Heavy lower
    ctx.fillStyle = "#C8D4E0";
    ctx.fillRect(5, 13, 10, 14);
    ctx.fillStyle = "#1A2A3A";
    ctx.fillRect(6, 18, 3, 6);
    ctx.fillStyle = "#FF6B2C";
    ctx.fillRect(3, 27, 14, 5);
    ctx.fillStyle = "#FFE066";
    ctx.fillRect(6, 27, 8, 6);
    ctx.fillStyle = "#5BC0EB";
    ctx.fillRect(5, 33, 2, 2);
    ctx.fillRect(13, 34, 2, 2);
    return c;
  })();
  const heavy = (() => {
    const { c, ctx } = canvas(22, 32);
    ctx.fillStyle = "#F5F7FA";
    ctx.fillRect(2, 4, 5, 16);
    ctx.fillRect(8, 2, 6, 18);
    ctx.fillRect(15, 4, 5, 16);
    ctx.fillStyle = "#1A1A22";
    ctx.fillRect(2, 3, 5, 1);
    ctx.fillRect(8, 1, 6, 1);
    ctx.fillRect(15, 3, 5, 1);
    ctx.fillStyle = "#FF6B2C";
    ctx.fillRect(2, 21, 5, 6);
    ctx.fillRect(8, 21, 6, 7);
    ctx.fillRect(15, 21, 5, 6);
    ctx.fillStyle = "#FFE066";
    ctx.fillRect(9, 22, 4, 5);
    ctx.fillStyle = "#5BC0EB";
    ctx.fillRect(3, 28, 1, 1);
    ctx.fillRect(18, 28, 1, 1);
    return c;
  })();
  const crew = (() => {
    const { c, ctx } = canvas(16, 30);
    ctx.fillStyle = "#1A1A22";
    ctx.fillRect(5, 5, 6, 14);
    ctx.fillStyle = "#F5F7FA";
    ctx.fillRect(6, 6, 4, 12);
    ctx.fillStyle = "#E8EEF4";
    ctx.fillRect(4, 2, 8, 6);
    ctx.fillStyle = "#5BC0EB";
    ctx.fillRect(6, 3, 4, 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(5, 3, 1, 1);
    ctx.fillStyle = "#FF6B2C";
    ctx.fillRect(5, 19, 6, 6);
    ctx.fillStyle = "#FFE066";
    ctx.fillRect(6, 20, 4, 6);
    ctx.fillStyle = "#5BC0EB";
    ctx.fillRect(7, 27, 1, 1);
    return c;
  })();
  return [starship, starshipB, starshipC, starshipStack, falcon, heavy, crew];
}

export function bakeSpaceXForeground(w = 480, h = 80) {
  const { c, ctx } = canvas(w, h);
  for (let x = 0; x < w; x += 24) {
    const len = 10 + ((x * 7) % 20);
    ctx.fillStyle = "#9AA8B4";
    ctx.fillRect(x + 6, 0, 3, len);
    ctx.fillStyle = "#5BC0EB";
    ctx.fillRect(x + 6, len - 2, 3, 2);
    if (x % 72 === 0) {
      ctx.fillStyle = "#FF6B2C";
      ctx.fillRect(x + 7, Math.max(2, len - 6), 2, 2);
    }
  }
  ctx.fillStyle = "#6A7884";
  ctx.fillRect(0, h - 12, w, 12);
  ctx.fillStyle = "#5BC0EB";
  ctx.fillRect(0, h - 14, w, 2);
  return c;
}

/** Soft nebula puff floaters - SpaceX parallax accents */
export function bakeSpaceXNebulaSet() {
  const a = (() => {
    const { c, ctx } = canvas(48, 32);
    const g = ctx.createRadialGradient(22, 16, 2, 22, 16, 20);
    g.addColorStop(0, "rgba(91, 192, 235, 0.85)");
    g.addColorStop(0.4, "rgba(140, 90, 180, 0.55)");
    g.addColorStop(1, "rgba(11, 29, 54, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 48, 32);
    ctx.fillStyle = "rgba(245, 247, 250, 0.7)";
    ctx.fillRect(14, 10, 1, 1);
    ctx.fillRect(28, 14, 1, 1);
    ctx.fillRect(20, 18, 1, 1);
    return c;
  })();
  const b = (() => {
    const { c, ctx } = canvas(48, 32);
    const g = ctx.createRadialGradient(26, 14, 2, 26, 14, 22);
    g.addColorStop(0, "rgba(255, 107, 44, 0.45)");
    g.addColorStop(0.35, "rgba(91, 192, 235, 0.55)");
    g.addColorStop(1, "rgba(11, 29, 54, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 48, 32);
    ctx.fillStyle = "rgba(245, 247, 250, 0.65)";
    ctx.fillRect(18, 12, 1, 1);
    ctx.fillRect(32, 16, 1, 1);
    return c;
  })();
  return [a, b];
}

/** Rocket flying toward a moon - SpaceX story accent */
export function bakeSpaceXRocketToMoon() {
  const { c, ctx } = canvas(40, 32);
  // Moon
  ctx.fillStyle = "#3A3A48";
  ctx.beginPath();
  ctx.ellipse(30, 10, 8, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#C8C8D8";
  ctx.beginPath();
  ctx.ellipse(30, 9, 8, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9090A8";
  ctx.fillRect(28, 7, 3, 2);
  ctx.fillRect(32, 11, 2, 2);
  ctx.fillStyle = "#5BC0EB";
  ctx.fillRect(24, 6, 1, 1);
  // Rocket body (nose toward moon)
  ctx.fillStyle = "#1A1A22";
  ctx.fillRect(6, 16, 14, 6);
  ctx.fillStyle = "#F5F7FA";
  ctx.fillRect(7, 17, 12, 4);
  ctx.fillStyle = "#C8D4E0";
  ctx.fillRect(16, 17, 3, 4);
  ctx.fillStyle = "#1A2A3A";
  ctx.fillRect(12, 17, 2, 4);
  // Nose cone
  ctx.fillStyle = "#F5F7FA";
  ctx.fillRect(19, 17, 3, 4);
  ctx.fillRect(21, 18, 2, 2);
  // Flame plume (aft)
  ctx.fillStyle = "#FF6B2C";
  ctx.fillRect(2, 16, 5, 6);
  ctx.fillStyle = "#FFE066";
  ctx.fillRect(3, 17, 3, 4);
  ctx.fillStyle = "#5BC0EB";
  ctx.fillRect(1, 18, 1, 1);
  ctx.fillRect(2, 21, 1, 1);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(8, 17, 1, 1);
  return c;
}

export function bakeSpaceXSet() {
  return {
    sky: bakeSpaceXSky(),
    pad: bakeSpaceXPadFar(),
    midscape: bakeSpaceXMidscape(),
    rockets: bakeSpaceXRocketSet(),
    nebulas: bakeSpaceXNebulaSet(),
    rocketToMoon: bakeSpaceXRocketToMoon(),
    foreground: bakeSpaceXForeground(),
  };
}

/** Soft deep space sky over the Moon */
export function bakeMoonSky(w = 480, h = 270) {
  const { c, ctx } = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0A0E18");
  g.addColorStop(0.4, "#121A2A");
  g.addColorStop(0.75, "#1A2438");
  g.addColorStop(1, "#2A3448");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Sparse stars
  ctx.fillStyle = "rgba(232, 238, 244, 0.9)";
  for (let i = 0; i < 70; i++) {
    const x = (i * 89 + 11) % w;
    const y = (i * 47 + 5) % Math.floor(h * 0.62);
    const s = 1 + (i % 4 === 0 ? 1 : 0);
    ctx.fillRect(x, y, s, s);
  }
  // Soft Earth glow on horizon
  const earth = ctx.createRadialGradient(w * 0.82, h * 0.18, 2, w * 0.82, h * 0.18, 48);
  earth.addColorStop(0, "rgba(126, 200, 232, 0.35)");
  earth.addColorStop(0.5, "rgba(90, 140, 200, 0.12)");
  earth.addColorStop(1, "rgba(10, 14, 24, 0)");
  ctx.fillStyle = earth;
  ctx.fillRect(w * 0.82 - 48, h * 0.18 - 48, 96, 96);
  const haze = ctx.createLinearGradient(0, h * 0.55, 0, h);
  haze.addColorStop(0, "rgba(126, 200, 232, 0)");
  haze.addColorStop(1, "rgba(168, 176, 192, 0.2)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
  return c;
}

/** Distant cratered lunar ridge */
export function bakeMoonSurfaceFar(w = 480, h = 110) {
  const { c, ctx } = canvas(w, h);
  const hills = [
    [0, 50, 80, 60],
    [60, 40, 100, 70],
    [140, 55, 90, 55],
    [220, 35, 120, 75],
    [320, 48, 90, 62],
    [400, 42, 90, 68],
  ];
  for (const [x, y, hw, hh] of hills) {
    ctx.fillStyle = "#6A6A78";
    ctx.beginPath();
    ctx.ellipse(x + hw * 0.5, y + hh * 0.7, hw * 0.55, hh * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#A8A8B4";
    ctx.beginPath();
    ctx.ellipse(x + hw * 0.45, y + hh * 0.55, hw * 0.4, hh * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Crater rings
  ctx.strokeStyle = "#8A8A98";
  ctx.lineWidth = 2;
  for (const [cx, cy, r] of [
    [90, 70, 14],
    [250, 65, 18],
    [380, 72, 12],
  ]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#7A7A88";
  ctx.fillRect(0, h - 10, w, 10);
  return c;
}

/** Mid Moon base modules */
export function bakeMoonMidscape(w = 480, h = 140) {
  const { c, ctx } = canvas(w, h);
  const mods = [
    [10, 60, 70, 60, "#6A7080"],
    [100, 45, 90, 75, "#5A6070"],
    [210, 55, 80, 65, "#646A7A"],
    [310, 40, 100, 80, "#585E6E"],
    [420, 50, 55, 70, "#6A7080"],
  ];
  for (const [x, y, mw, mh, body] of mods) {
    ctx.fillStyle = body;
    ctx.fillRect(x, y, mw, mh);
    ctx.fillStyle = "#C8C8D0";
    ctx.fillRect(x, y, mw, 4);
    ctx.fillStyle = "#7EC8E8";
    ctx.fillRect(x + 6, y + 12, mw - 12, 2);
    ctx.fillStyle = "#FFE8A0";
    ctx.fillRect(x + mw * 0.5 - 1, y - 4, 2, 4);
  }
  ctx.fillStyle = "#9A9AA8";
  ctx.fillRect(0, h - 16, w, 16);
  return c;
}

/** Procedural satellite floaters - cake-cloud style fallback */
export function bakeMoonSatelliteSet() {
  const make = (w, h, draw) => {
    const { c, ctx } = canvas(w, h);
    draw(ctx, w, h);
    return c;
  };
  const a = make(28, 18, (ctx) => {
    ctx.fillStyle = "#1A1A22";
    ctx.fillRect(8, 6, 12, 6);
    ctx.fillStyle = "#C8D4E0";
    ctx.fillRect(9, 7, 10, 4);
    ctx.fillStyle = "#7EC8E8";
    ctx.fillRect(12, 8, 4, 2);
    ctx.fillStyle = "#A8B4C0";
    ctx.fillRect(2, 8, 6, 2);
    ctx.fillRect(20, 8, 6, 2);
    ctx.fillStyle = "#FFE8A0";
    ctx.fillRect(13, 4, 2, 2);
  });
  const b = make(30, 16, (ctx) => {
    ctx.fillStyle = "#D0D8E0";
    ctx.fillRect(10, 5, 10, 6);
    ctx.fillStyle = "#7EC8E8";
    ctx.fillRect(12, 6, 6, 3);
    ctx.fillStyle = "#8A96A4";
    ctx.fillRect(0, 7, 10, 2);
    ctx.fillRect(20, 7, 10, 2);
    ctx.fillStyle = "#FFE8A0";
    ctx.fillRect(14, 3, 2, 2);
  });
  const c = make(26, 14, (ctx) => {
    ctx.fillStyle = "#E8EEF4";
    ctx.fillRect(6, 4, 14, 5);
    ctx.fillStyle = "#5BC0EB";
    ctx.fillRect(10, 5, 6, 2);
    ctx.fillStyle = "#A8B4C0";
    ctx.fillRect(1, 5, 5, 2);
    ctx.fillRect(20, 5, 5, 2);
    ctx.fillStyle = "#FFE8A0";
    ctx.fillRect(12, 1, 2, 3);
  });
  const d = make(24, 20, (ctx) => {
    ctx.fillStyle = "#C8C8D0";
    ctx.beginPath();
    ctx.ellipse(12, 10, 6, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7EC8E8";
    ctx.fillRect(10, 8, 4, 3);
    ctx.fillStyle = "#A8B4C0";
    ctx.fillRect(0, 9, 6, 2);
    ctx.fillRect(18, 9, 6, 2);
    ctx.fillStyle = "#FFE8A0";
    ctx.fillRect(11, 2, 2, 3);
  });
  return [a, b, c, d];
}

/** Electromagnetic rail gun on lunar surface */
export function bakeMoonRailgun() {
  const { c, ctx } = canvas(40, 20);
  ctx.fillStyle = "#1A1A22";
  ctx.fillRect(2, 10, 32, 6);
  ctx.fillStyle = "#A8B4C0";
  ctx.fillRect(3, 11, 30, 4);
  ctx.fillStyle = "#7EC8E8";
  ctx.fillRect(6, 12, 22, 2);
  ctx.fillStyle = "#6A7080";
  ctx.fillRect(0, 14, 8, 6);
  ctx.fillStyle = "#FFE8A0";
  ctx.fillRect(33, 11, 4, 4);
  ctx.fillStyle = "#5BC0EB";
  ctx.fillRect(34, 12, 2, 2);
  return c;
}

export function bakeMoonForeground(w = 480, h = 80) {
  const { c, ctx } = canvas(w, h);
  for (let x = 0; x < w; x += 28) {
    const len = 8 + ((x * 5) % 16);
    ctx.fillStyle = "#8A8A98";
    ctx.fillRect(x + 4, 0, 3, len);
    ctx.fillStyle = "#7EC8E8";
    ctx.fillRect(x + 4, len - 2, 3, 2);
  }
  ctx.fillStyle = "#6A6A78";
  ctx.fillRect(0, h - 14, w, 14);
  ctx.fillStyle = "#7EC8E8";
  ctx.fillRect(0, h - 16, w, 2);
  return c;
}

/** Soft starship cabin plate for win / EXIT story accent */
export function bakeMoonStarshipInterior(w = 480, h = 270) {
  const { c, ctx } = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#2A3448");
  g.addColorStop(0.5, "#3A4658");
  g.addColorStop(1, "#1A2434");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Portholes
  for (const [px, py, r] of [
    [120, 90, 36],
    [360, 100, 40],
  ]) {
    ctx.fillStyle = "#0A0E18";
    ctx.beginPath();
    ctx.ellipse(px, py, r, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#C8D4E0";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "rgba(126, 200, 232, 0.35)";
    ctx.beginPath();
    ctx.ellipse(px - 8, py - 6, r * 0.35, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bench / cabin glow
  ctx.fillStyle = "#4A5464";
  ctx.fillRect(40, h - 70, w - 80, 40);
  ctx.fillStyle = "rgba(232, 192, 144, 0.25)";
  ctx.fillRect(60, h - 100, w - 120, 20);
  return c;
}

export function bakeMoonSet() {
  return {
    sky: bakeMoonSky(),
    surface: bakeMoonSurfaceFar(),
    midscape: bakeMoonMidscape(),
    satellites: bakeMoonSatelliteSet(),
    railgun: bakeMoonRailgun(),
    starshipInterior: bakeMoonStarshipInterior(),
    foreground: bakeMoonForeground(),
  };
}

/** Inside Starship cabin - warm steel + cyan instruments */
export function bakeStarshipCabin(w = 480, h = 270) {
  const { c, ctx } = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1A2434");
  g.addColorStop(0.4, "#2A3848");
  g.addColorStop(0.75, "#3A4658");
  g.addColorStop(1, "#243040");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Ceiling ribs
  ctx.fillStyle = "#4A5464";
  for (let x = 0; x < w; x += 48) {
    ctx.fillRect(x, 8, 28, 6);
  }
  // Portholes with space
  for (const [px, py, r] of [
    [100, 88, 34],
    [240, 78, 38],
    [380, 92, 32],
  ]) {
    ctx.fillStyle = "#060A12";
    ctx.beginPath();
    ctx.ellipse(px, py, r, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#C8D4E0";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "rgba(126, 200, 232, 0.28)";
    ctx.beginPath();
    ctx.ellipse(px - 8, py - 8, r * 0.3, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Stars
    ctx.fillStyle = "#FFE8A0";
    ctx.fillRect(px - 10, py - 4, 1, 1);
    ctx.fillRect(px + 8, py + 6, 1, 1);
    ctx.fillRect(px + 2, py - 14, 1, 1);
  }
  // Warm cabin wash
  ctx.fillStyle = "rgba(232, 192, 144, 0.12)";
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
  // Floor
  ctx.fillStyle = "#2A3444";
  ctx.fillRect(0, h - 36, w, 36);
  ctx.fillStyle = "#7EC8E8";
  ctx.fillRect(0, h - 38, w, 2);
  return c;
}

export function bakeStarshipConsole(w = 96, h = 72) {
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = "#1A2434";
  ctx.fillRect(8, 20, w - 16, h - 28);
  ctx.fillStyle = "#3A4658";
  ctx.fillRect(12, 12, w - 24, 16);
  // Screens
  ctx.fillStyle = "#0A1820";
  ctx.fillRect(16, 28, 28, 18);
  ctx.fillRect(50, 28, 28, 18);
  ctx.fillStyle = "#7EC8E8";
  ctx.globalAlpha = 0.7;
  ctx.fillRect(18, 30, 24, 6);
  ctx.fillStyle = "#FFE8A0";
  ctx.fillRect(52, 34, 24, 4);
  ctx.globalAlpha = 1;
  // Levers
  ctx.fillStyle = "#C8D4E0";
  ctx.fillRect(24, 50, 4, 12);
  ctx.fillRect(40, 48, 4, 14);
  ctx.fillRect(68, 50, 4, 12);
  ctx.fillStyle = "#E87858";
  ctx.fillRect(22, 48, 8, 4);
  return c;
}

export function bakeStarshipMars(w = 480, h = 270) {
  const { c, ctx } = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#060810");
  g.addColorStop(0.45, "#181028");
  g.addColorStop(1, "#2A1810");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Stars
  ctx.fillStyle = "#FFE8A0";
  for (let i = 0; i < 80; i++) {
    const x = (i * 47) % w;
    const y = (i * 31) % Math.floor(h * 0.65);
    ctx.globalAlpha = 0.3 + (i % 5) * 0.12;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
  // Mars disc
  const mx = w * 0.62;
  const my = h * 0.72;
  const mr = h * 0.48;
  const mg = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
  mg.addColorStop(0, "#E87858");
  mg.addColorStop(0.45, "#C05030");
  mg.addColorStop(0.85, "#8A3020");
  mg.addColorStop(1, "#401810");
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.ellipse(mx, my, mr, mr * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  // Atmosphere haze
  ctx.fillStyle = "rgba(232, 160, 120, 0.18)";
  ctx.beginPath();
  ctx.ellipse(mx, my - 8, mr * 1.08, mr * 0.98, 0, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function bakeStarshipSet() {
  return {
    cabin: bakeStarshipCabin(),
    cabinNear: bakeMoonStarshipInterior(),
    console: bakeStarshipConsole(),
    mars: bakeStarshipMars(),
  };
}

export function bakeNeonSet() {
  return {
    skySunset: bakeSynthSky(),
    skyNight: bakeNightSky(),
    cityFar: bakeCityFar(),
    cityNear: bakeCityNear(),
    mountains: bakeFarMountains(),
    clouds: bakeCloudBank(),
    flyingCars: bakeFlyingCarSet(),
    ground: bakeNeonGround(16),
    toxic: bakeToxicFluid(16),
    platform: bakeNeonPlatform(16, 8),
    platformSlip: bakeSlipPlatform(32, 10),
    platformBounce: bakeBouncePlatform(32, 12),
    pole: bakeUtilityPole(),
    kiosk: bakeKiosk(),
    track: bakeNeonTrack(),
    cables: bakeCableBundle(),
    powerups: bakeIsoPowerups(),
    cake: bakeCakeSet(),
    boring: bakeBoringSet(),
    neuralink: bakeNeuralinkSet(),
    tesla: bakeTeslaSet(),
    spacex: bakeSpaceXSet(),
    moon: bakeMoonSet(),
    starship: bakeStarshipSet(),
  };
}
