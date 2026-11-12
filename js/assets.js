/* Load MyPixels + PixelWhale + Grok Imagine sprites */
const BASE = "assets/game";
const PW = "assets/pixelwhale/ready";
const IMAGINE = "assets/imagine";

/** Bumped from sheets/manifest.json `generatedAt` so hard-refresh picks up new sprites. */
let ART_CACHE = "rocket-boss-20260724";

/**
 * Sprite footprints for the 480x270 framebuffer (TILE = 16).
 * Player + enemies prefer clean (non-pixelated) per-anim Grok video frames
 * packed with packFramesClean. Legacy 360 pixel sheets remain a fallback.
 */
export const PIXEL_W = 480;
export const PIXEL_H = 270;
/** Sheet cell authoring size (see scripts/rebuild-sheets-360.mjs). */
export const SHEET_CELL = 360;
export const SHEET_LOGICAL = 90;
/** World boxes - drones at half prior size (40% of base); player stays at prior 30%-smaller size. */
export const DRONE_TARGET_W = Math.round(90 * 0.8 * 0.5);
export const DRONE_TARGET_H = Math.round(72 * 0.8 * 0.5);
export const PLAYER_TARGET_W = Math.round(90 * 0.7);
export const PLAYER_TARGET_H = Math.round(72 * 0.7);
export const SOLDIER_TARGET_W = 72;
export const SOLDIER_TARGET_H = 90;
/** Level 3 car-droid boss - wider chassis footprint. */
export const CARBOT_TARGET_W = 128;
export const CARBOT_TARGET_H = 96;
/** Level 4 rocket boss - tall Starship footprint. */
export const ROCKET_TARGET_W = 96;
export const ROCKET_TARGET_H = 140;
export const BLADE_TARGET_W = 36;
export const BLADE_TARGET_H = 72;
export const PROP_TARGET = 24;
export const TILE_TARGET = 16;
/** Bake a 1px hard silhouette outline after packing (enemies / legacy pixel sheets). */
export const BAKE_SPRITE_OUTLINE = true;
/** Player clean sheets: light readability outline only (no pixel harden). */
export const PLAYER_BAKE_OUTLINE = true;
/** Solid black - not dark-purple ink (that vanished into the synthwave sky). */
export const SPRITE_OUTLINE_COLOR = "#000000";

function assetUrl(src) {
  if (!src) return src;
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}v=${encodeURIComponent(ART_CACHE)}`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

async function loadOptional(src) {
  try {
    return await loadImage(src);
  } catch (_) {
    return null;
  }
}

/** Preload an HTML5 video element (muted, playsInline) for canvas drawImage. */
function loadOptionalVideo(src) {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("muted", "");
    let settled = false;
    const done = (val) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };
    v.onloadeddata = () => done(v);
    v.onerror = () => done(null);
    // Some browsers fire canplay before loadeddata
    v.oncanplay = () => {
      if (v.readyState >= 2) done(v);
    };
    v.src = src;
    try {
      v.load();
    } catch (_) {
      done(null);
    }
    // Don't hang preload forever if metadata never arrives
    setTimeout(() => done(v.readyState >= 2 ? v : null), 8000);
  });
}

export function punchBlack(img, threshold = 18) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] <= threshold && d[i + 1] <= threshold && d[i + 2] <= threshold) {
      d[i + 3] = 0;
    }
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/** Knock out flat white / light-gray plates (e.g. candy Imagine plates) to transparency. */
export function punchWhite(img, threshold = 235) {
  if (!img) return null;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] >= threshold && d[i + 1] >= threshold && d[i + 2] >= threshold) {
      d[i + 3] = 0;
    }
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/**
 * Flood-fill from edges: kill black / white / flat gray plates so only the
 * candy silhouette stays (fixes white-card candy plates with box outlines).
 */
export function punchPlateEdges(img, { black = 40, white = 200, graySpread = 36 } = {}) {
  if (!img) return null;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, c.width, c.height);
  const d = image.data;
  const w = c.width;
  const h = c.height;
  const seen = new Uint8Array(w * h);
  const stack = [];

  const isPlate = (i) => {
    const a = d[i + 3];
    if (a < 8) return true;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    if (r <= black && g <= black && b <= black) return true;
    if (r >= white && g >= white && b >= white) return true;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    // Desaturated light-gray card
    if (mx - mn <= graySpread && mn >= 170) return true;
    return false;
  };

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (seen[p]) return;
    if (!isPlate(p * 4)) return;
    seen[p] = 1;
    stack.push(p);
  };

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  while (stack.length) {
    const p = stack.pop();
    const i = p * 4;
    d[i + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  // Also kill any remaining pure black / pure white islands
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    if ((r <= 28 && g <= 28 && b <= 28) || (r >= 240 && g >= 240 && b >= 240)) {
      d[i + 3] = 0;
    }
  }

  ctx.putImageData(image, 0, 0);
  return c;
}

/**
 * Recolor a player-cat frame into a matching black-cat silhouette (Elove).
 * Keeps shape / highlights; shifts fur to near-black with a soft blue sheen.
 */
export function tintToBlackCat(img) {
  if (!img) return null;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 10) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const l = (r + g + b) / 3;
    // Preserve bright eye / muzzle highlights as soft amber
    const bright = l > 195 && Math.abs(r - g) < 50;
    if (bright) {
      d[i] = Math.min(255, Math.round(l * 0.95 + 20));
      d[i + 1] = Math.min(255, Math.round(l * 0.78));
      d[i + 2] = Math.min(255, Math.round(l * 0.42));
      continue;
    }
    // Soft cyan accent bits (rocket / suit trim) stay slightly cool
    const cyanish = b > r + 25 && b > g;
    if (cyanish && l > 90) {
      d[i] = Math.round(l * 0.22);
      d[i + 1] = Math.round(l * 0.38);
      d[i + 2] = Math.round(l * 0.55);
      continue;
    }
    // Black fur - keep a little form from luminance
    const t = Math.max(8, Math.min(48, l * 0.22));
    d[i] = Math.round(t * 0.85);
    d[i + 1] = Math.round(t * 0.88);
    d[i + 2] = Math.round(t * 1.05 + 4);
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/**
 * Lift near-black / ink platform fills toward a type-colored pastel floor
 * so Imagine slabs match the brighter neon-pastel world (keeps neon lips).
 */
export function liftPlatformFills(img, floorRgb = [90, 68, 144], maxL = 70) {
  if (!img) return img;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  const [tr, tg, tb] = floorRgb;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 12) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const l = (r + g + b) / 3;
    // Preserve neon accents
    const hotPink = r > 180 && g < 160 && b > 120;
    const hotCyan = b > 180 && g > 140 && r < 140;
    const hotGold = r > 200 && g > 160 && b < 140;
    const bright = l > 180;
    if (hotPink || hotCyan || hotGold || bright) continue;
    if (l >= maxL) continue;
    // Blend dark fill toward type floor
    const t = 1 - l / maxL;
    d[i] = Math.round(r + (tr - r) * t);
    d[i + 1] = Math.round(g + (tg - g) * t);
    d[i + 2] = Math.round(b + (tb - b) * t);
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/**
 * Shift hot-magenta / pink neon accents toward a target hue so Imagine slabs
 * don't all share the same pink lip before type identity is stamped.
 */
export function remapPlatformAccents(img, mode = "grip") {
  if (!img) return img;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 12) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const hotPink = r > 170 && g < 170 && b > 100 && r > g + 20;
    const hotCyan = b > 180 && g > 140 && r < 150;
    const hotGold = r > 200 && g > 150 && b < 140;
    if (mode === "grip") {
      // Magenta lip -> light purple neon
      if (hotPink) {
        d[i] = Math.round(r * 0.55 + 179 * 0.45);
        d[i + 1] = Math.round(g * 0.35 + 136 * 0.65);
        d[i + 2] = Math.round(Math.max(b, 200) * 0.4 + 255 * 0.6);
      }
    } else if (mode === "slip") {
      // Push pink toward ice cyan; keep gold flecks
      if (hotPink && !hotGold) {
        d[i] = Math.round(r * 0.25 + 0 * 0.75);
        d[i + 1] = Math.round(g * 0.35 + 232 * 0.65);
        d[i + 2] = 255;
      }
      if (!hotCyan && !hotGold && r < 160 && g < 160 && b < 180) {
        // Cool the chassis toward ice blue
        d[i] = Math.round(r * 0.55 + 90 * 0.45);
        d[i + 1] = Math.round(g * 0.45 + 180 * 0.55);
        d[i + 2] = Math.round(b * 0.35 + 220 * 0.65);
      }
    } else if (mode === "bounce") {
      // Keep pink; boost mid tones toward rose/gold
      if (!hotPink && !hotCyan && !hotGold && (r + g + b) / 3 < 160) {
        d[i] = Math.round(r * 0.4 + 220 * 0.6);
        d[i + 1] = Math.round(g * 0.45 + 120 * 0.55);
        d[i + 2] = Math.round(b * 0.45 + 150 * 0.55);
      }
    }
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/**
 * Rebuild a clean flat slab from Imagine platform art.
 * Drops baked-in machine/terminal greebles, dark undercarriage, and hanging cables -
 * those showed through the old translucent wash as dark blocky props on the pads.
 * kind: "grip" | "slip" | "bounce"
 */
export function stampPlatformIdentity(img, kind = "grip") {
  if (!img) return img;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const w = c.width;
  const h = c.height;
  const lipH = Math.max(4, Math.round(h * 0.28));
  // Compact chassis only - no dangling cable / under-greeble band
  const slabH = Math.min(h, Math.max(lipH + 6, Math.round(h * 0.55)));
  ctx.clearRect(0, 0, w, h);

  if (kind === "slip") {
    // Opaque ice chassis (hides dark mechanical underbelly + cyan LED boxes)
    ctx.fillStyle = "#7ec8f0";
    ctx.fillRect(0, lipH, w, slabH - lipH);
    ctx.fillStyle = "#5aa8d8";
    ctx.fillRect(1, slabH - 2, w - 2, 2);
    // Cyan glass lip + frost sparkles
    ctx.fillStyle = "#00e8ff";
    ctx.fillRect(0, 0, w, lipH + 1);
    ctx.fillStyle = "#7df9ff";
    ctx.fillRect(0, 0, w, Math.max(2, lipH - 1));
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, 2);
    for (let x = 4; x < w - 4; x += 10) {
      ctx.fillRect(x, 2, 3, 1);
      ctx.fillRect(x + 2, 3, 1, 1);
    }
  } else if (kind === "bounce") {
    // Opaque rose chassis (hides end-cap terminal greebles)
    ctx.fillStyle = "#e890b8";
    ctx.fillRect(0, lipH, w, slabH - lipH);
    ctx.fillStyle = "#d878a8";
    ctx.fillRect(1, slabH - 2, w - 2, 2);
    // Gold launch deck + pink underband + chevrons
    ctx.fillStyle = "#ff2ea6";
    ctx.fillRect(0, lipH - 1, w, 3);
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(0, 0, w, lipH);
    ctx.fillStyle = "#fff0a8";
    ctx.fillRect(0, 0, w, 2);
    ctx.fillStyle = "#ff2ea6";
    for (let x = 4; x < w - 6; x += 12) {
      ctx.fillRect(x + 3, 1, 4, 1);
      ctx.fillRect(x + 2, 2, 6, 1);
      ctx.fillRect(x + 4, 0, 2, 1);
    }
  } else {
    // Opaque lilac chassis (hides panel greebles + baked hanging wires)
    ctx.fillStyle = "#8f78d4";
    ctx.fillRect(0, lipH, w, slabH - lipH);
    ctx.fillStyle = "#6a52b0";
    ctx.fillRect(1, slabH - 2, w - 2, 2);
    // Purple tread lip + corner brackets (no magenta)
    ctx.fillStyle = "#b388ff";
    ctx.fillRect(0, 0, w, lipH);
    ctx.fillStyle = "#d6b6ff";
    ctx.fillRect(0, 0, w, Math.max(2, lipH - 1));
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, 1);
    ctx.fillStyle = "#9a6ef0";
    for (let x = 2; x < w - 2; x += 5) ctx.fillRect(x, lipH - 1, 3, 1);
    ctx.fillStyle = "#e8d4ff";
    ctx.fillRect(0, 0, 4, lipH + 2);
    ctx.fillRect(w - 4, 0, 4, lipH + 2);
  }
  return c;
}

/** Flood-fill near-black from edges only - keeps dark character bodies.
 * Threshold stays low so mid-tone body shading is not eaten. Solid black
 * silhouette outlines are re-applied after packing via bakeHardOutline. */
export function punchBlackEdges(img, threshold = 10) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  const w = c.width;
  const h = c.height;
  const seen = new Uint8Array(w * h);
  const stack = [];

  const isBg = (i) =>
    d[i] <= threshold && d[i + 1] <= threshold && d[i + 2] <= threshold && d[i + 3] > 0;

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (seen[p]) return;
    if (!isBg(p * 4)) return;
    seen[p] = 1;
    stack.push(p);
  };

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  while (stack.length) {
    const p = stack.pop();
    d[p * 4 + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  ctx.putImageData(data, 0, 0);
  return c;
}

export function trimAlpha(src) {
  const ctx = src.getContext("2d");
  const { width: w, height: h } = src;
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return src;
  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = tw;
  out.height = th;
  const octx = out.getContext("2d");
  octx.imageSmoothingEnabled = false;
  octx.drawImage(src, minX, minY, tw, th, 0, 0, tw, th);
  return out;
}

/**
 * Re-crop anim frames so opaque pixels end at the bottom edge (no air under feet),
 * then pad back into boxWxboxH bottom-aligned.
 */
function feetCropAnims(anims, boxW, boxH) {
  if (!anims) return anims;
  const out = {};
  for (const [name, frames] of Object.entries(anims)) {
    out[name] = (frames || []).map((frame) => {
      if (!frame) return frame;
      const tight = trimAlpha(frame);
      if (tight.width === boxW && tight.height === boxH) {
        // Already full box - still drop empty bottom rows only
        const cropped = trimAlpha(tight);
        if (cropped.height === boxH && cropped.width === boxW) return frame;
      }
      const c = document.createElement("canvas");
      c.width = boxW;
      c.height = boxH;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, boxW, boxH);
      const dw = Math.min(boxW, tight.width);
      const dh = Math.min(boxH, tight.height);
      const dx = ((boxW - dw) / 2) | 0;
      const dy = boxH - dh;
      ctx.drawImage(tight, 0, 0, dw, dh, dx, dy, dw, dh);
      return c;
    });
  }
  return out;
}

/** Largest integer downscale factor so floor(w/n)xfloor(h/n) fits in box (or 1 if already fits). */
export function integerFitFactor(srcW, srcH, maxW, maxH) {
  if (srcW <= maxW && srcH <= maxH) return 1;
  let n = 1;
  while (n < 64 && (Math.floor(srcW / n) > maxW || Math.floor(srcH / n) > maxH)) n++;
  return n;
}

export function fitNearest(src, maxW, maxH) {
  const n = integerFitFactor(src.width, src.height, maxW, maxH);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.floor(src.width / n));
  c.height = Math.max(1, Math.floor(src.height / n));
  // If integer factor still overshoots (odd sizes), clamp with a second nearest pass
  if (c.width > maxW || c.height > maxH) {
    const s = Math.min(maxW / c.width, maxH / c.height);
    const w = Math.max(1, Math.round(c.width * s));
    const h = Math.max(1, Math.round(c.height * s));
    const tmp = document.createElement("canvas");
    tmp.width = c.width;
    tmp.height = c.height;
    const tctx = tmp.getContext("2d");
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(src, 0, 0, c.width, c.height);
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, w, h);
    return c;
  }
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

function imgToCanvas(img) {
  if (img.getContext) return img;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return c;
}

/** Fit into PIXEL_WxPIXEL_H canvas (transparent pad), nearest-neighbor. */
export function toPixelFrame(src, w = PIXEL_W, h = PIXEL_H) {
  const fitted = fitNearest(src, w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const ox = ((w - fitted.width) / 2) | 0;
  const oy = ((h - fitted.height) / 2) | 0;
  ctx.drawImage(fitted, ox, oy);
  return c;
}

function prepSprite(img, maxW, maxH, punch = true) {
  if (!img) return null;
  const cap = Math.max(PIXEL_W, PIXEL_H);
  const pre = fitNearest(imgToCanvas(img), Math.min(cap, img.width), Math.min(cap, img.height));
  const punched = punch ? punchBlackEdges(pre) : pre;
  return fitNearest(trimAlpha(punched), maxW, maxH);
}

/** Fit into a fixed box (centered) so every anim frame shares the same footprint. */
export function prepSpriteFixed(img, boxW, boxH, punch = true) {
  if (!img) return null;
  const cap = Math.max(PIXEL_W, PIXEL_H);
  const pre = fitNearest(imgToCanvas(img), Math.min(cap, img.width), Math.min(cap, img.height));
  const punched = punch ? punchBlackEdges(pre) : pre;
  const trimmed = trimAlpha(punched);
  return packFramesUniform([trimmed], boxW, boxH)[0];
}

/**
 * Pack trimmed canvases with one shared INTEGER scale so subjects stay the same
 * size and pixel grids stay crisp. Two-step blit (scale -> 1:1 pad) avoids mush.
 * Optionally bakes a 1px hard outline (Grok Imagine sheet readability).
 */
export function packFramesUniform(trimmedFrames, boxW, boxH) {
  if (!trimmedFrames?.length) return [];
  let maxW = 1;
  let maxH = 1;
  const heights = [];
  for (const t of trimmedFrames) {
    maxW = Math.max(maxW, t.width);
    maxH = Math.max(maxH, t.height);
    heights.push(t.height);
  }
  heights.sort((a, b) => a - b);
  const medianH = heights[(heights.length / 2) | 0] || maxH;
  const largeH = heights[Math.min(heights.length - 1, Math.floor(heights.length * 0.75))] || medianH;
  const targetH = Math.max(medianH, largeH);

  // Reserve 2px if we bake an outline around the silhouette
  const outlinePad = BAKE_SPRITE_OUTLINE ? 2 : 0;
  const fitW = Math.max(1, boxW - outlinePad);
  const fitH = Math.max(1, boxH - outlinePad);

  // Shared integer downscale (1 = native sheet pixels - preferred path)
  const down = integerFitFactor(maxW, maxH, fitW, fitH);

  return trimmedFrames.map((trimmed) => {
    let w = Math.max(1, Math.floor(trimmed.width / down));
    let h = Math.max(1, Math.floor(trimmed.height / down));

    // Integer upscale boost for undersized poses (cyborg blast) when it still fits
    if (trimmed.height < targetH * 0.95) {
      const want = Math.max(1, Math.round((targetH / Math.max(1, trimmed.height)) * (trimmed.height / down)));
      let up = 1;
      while (up < 8 && w * (up + 1) <= fitW && h * (up + 1) <= fitH && h * (up + 1) <= want + 2) {
        up++;
      }
      w *= up;
      h *= up;
    }

    // Final safety clamp - prefer dropping to a smaller integer factor over fractional scale
    if (w > fitW || h > fitH) {
      const n2 = integerFitFactor(trimmed.width, trimmed.height, fitW, fitH);
      w = Math.max(1, Math.floor(trimmed.width / n2));
      h = Math.max(1, Math.floor(trimmed.height / n2));
      if (w > fitW || h > fitH) {
        const s = Math.min(fitW / w, fitH / h);
        w = Math.max(1, Math.round(w * s));
        h = Math.max(1, Math.round(h * s));
      }
    }

    // Step 1: nearest scale into a tight canvas (exact wxh)
    const scaled = document.createElement("canvas");
    scaled.width = w;
    scaled.height = h;
    const sctx = scaled.getContext("2d");
    sctx.imageSmoothingEnabled = false;
    sctx.clearRect(0, 0, w, h);
    sctx.drawImage(trimmed, 0, 0, w, h);
    let spr = hardenPixelArt(scaled);
    // Normalize partial AI ink rims, then bake a uniform solid black outline
    spr = stripDarkOuterRim(spr);
    if (BAKE_SPRITE_OUTLINE) spr = bakeHardOutline(spr, SPRITE_OUTLINE_COLOR);

    // Step 2: 1:1 pad into the shared footprint (bottom-aligned for feet)
    const c = document.createElement("canvas");
    c.width = boxW;
    c.height = boxH;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, boxW, boxH);
    ctx.drawImage(spr, ((boxW - spr.width) / 2) | 0, boxH - spr.height);
    return c;
  });
}

/**
 * Clean (non-pixelated) pack for per-anim player video frames.
 * Smooth scale into a shared footprint - no hardenPixelArt / channel snap.
 */
export function packFramesClean(
  trimmedFrames,
  boxW,
  boxH,
  bakeOutline = PLAYER_BAKE_OUTLINE,
  { bottomAlign = false } = {}
) {
  if (!trimmedFrames?.length) return [];
  let maxW = 1;
  let maxH = 1;
  for (const t of trimmedFrames) {
    maxW = Math.max(maxW, t.width);
    maxH = Math.max(maxH, t.height);
  }
  const outlinePad = bakeOutline ? 2 : 0;
  const fitW = Math.max(1, boxW - outlinePad);
  const fitH = Math.max(1, boxH - outlinePad);
  const scale = Math.min(fitW / maxW, fitH / maxH);

  return trimmedFrames.map((trimmed) => {
    const w = Math.max(1, Math.round(trimmed.width * scale));
    const h = Math.max(1, Math.round(trimmed.height * scale));
    const scaled = document.createElement("canvas");
    scaled.width = w;
    scaled.height = h;
    const sctx = scaled.getContext("2d");
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = "high";
    sctx.clearRect(0, 0, w, h);
    sctx.drawImage(trimmed, 0, 0, w, h);
    let spr = scaled;
    if (bakeOutline) spr = bakeHardOutline(spr, SPRITE_OUTLINE_COLOR);
    // Ground units: cut empty rows under boots, then pin feet to box bottom
    if (bottomAlign) spr = trimAlpha(spr);

    const c = document.createElement("canvas");
    c.width = boxW;
    c.height = boxH;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, boxW, boxH);
    const dx = ((boxW - spr.width) / 2) | 0;
    const dy = bottomAlign ? boxH - spr.height : ((boxH - spr.height) / 2) | 0;
    ctx.drawImage(spr, dx, dy);
    return c;
  });
}

/** Crush soft AI edges into hard opaque pixels (stops outline crawl). */
export function hardenPixelArt(src) {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0);
  const image = ctx.getImageData(0, 0, c.width, c.height);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 72) {
      d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
    } else {
      // Snap channels slightly to reduce shimmer fringe colors
      d[i] = ((d[i] / 8) | 0) * 8;
      d[i + 1] = ((d[i + 1] / 8) | 0) * 8;
      d[i + 2] = ((d[i + 2] / 8) | 0) * 8;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return c;
}

/**
 * Remove inconsistent AI dark-ink rims on the silhouette edge so every frame
 * gets the same bakeHardOutline ring (source frames vary idle/fly/slash).
 */
export function stripDarkOuterRim(src, maxLum = 52) {
  const w = src.width;
  const h = src.height;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0);
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  const kill = new Uint8Array(w * h);

  const alphaAt = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return 0;
    return d[(y * w + x) * 4 + 3];
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] < 72) continue;
      const open =
        alphaAt(x - 1, y) < 72 ||
        alphaAt(x + 1, y) < 72 ||
        alphaAt(x, y - 1) < 72 ||
        alphaAt(x, y + 1) < 72;
      if (!open) continue;
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (lum <= maxLum) kill[y * w + x] = 1;
    }
  }

  for (let p = 0; p < kill.length; p++) {
    if (!kill[p]) continue;
    const i = p * 4;
    d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
  }
  ctx.putImageData(image, 0, 0);
  return c;
}

/** 1px hard silhouette outline - solid black ring for every packed frame. */
export function bakeHardOutline(src, color = SPRITE_OUTLINE_COLOR) {
  const w = src.width;
  const h = src.height;
  const c = document.createElement("canvas");
  c.width = w + 2;
  c.height = h + 2;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const sil = document.createElement("canvas");
  sil.width = w;
  sil.height = h;
  const sctx = sil.getContext("2d");
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(src, 0, 0);
  sctx.globalCompositeOperation = "source-in";
  sctx.fillStyle = color;
  sctx.fillRect(0, 0, w, h);

  for (const [dx, dy] of [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
    [1, 0],
    [1, 2],
    [0, 1],
    [2, 1],
  ]) {
    ctx.drawImage(sil, dx, dy);
  }
  ctx.drawImage(src, 1, 1);
  return c;
}

function punchTrimFrame(img) {
  if (!img) return null;
  const cap = Math.max(PIXEL_W, PIXEL_H);
  const pre = fitNearest(imgToCanvas(img), Math.min(cap, img.width), Math.min(cap, img.height));
  return trimAlpha(punchBlackEdges(pre));
}

function scaleTo(img, w, h) {
  if (!img) return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, w, h);
  return c;
}

/** Slice a horizontal/grid sprite sheet into prepared frame canvases. */
export function sliceSheet(img, cols, rows, maxW, maxH, cellHint = 0) {
  if (!img) return [];
  const cellW = cellHint || Math.floor(img.width / cols);
  const cellH = cellHint || Math.floor(img.height / rows);
  const trimmed = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("canvas");
      cell.width = cellW;
      cell.height = cellH;
      const ctx = cell.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, c * cellW, r * cellH, cellW, cellH, 0, 0, cellW, cellH);
      const t = punchTrimFrame(cell);
      if (t) trimmed.push(t);
    }
  }
  return packFramesUniform(trimmed, maxW, maxH);
}

function mapAnims(frames, anims) {
  const out = {};
  for (const [name, idxs] of Object.entries(anims || {})) {
    out[name] = idxs.map((i) => frames[i]).filter(Boolean);
    if (!out[name].length && frames[0]) out[name] = [frames[0]];
  }
  return out;
}

/** Load sequential Grok-video capture frames: frames/video/<id>/<anim>-00.png ... */
async function loadVideoAnimDir(
  id,
  animNames,
  maxW,
  maxH,
  { clean = false, bottomAlign = false, bakeOutline = PLAYER_BAKE_OUTLINE } = {}
) {
  const byAnim = {};
  const allTrimmed = [];
  const indexMap = []; // { name, localIdx }

  for (const name of animNames) {
    byAnim[name] = [];
    for (let i = 0; i < 32; i++) {
      const src = assetUrl(
        `${IMAGINE}/frames/video/${id}/${name}-${String(i).padStart(2, "0")}.png`
      );
      const img = await loadOptional(src);
      if (!img) break;
      const trimmed = punchTrimFrame(img);
      if (!trimmed) break;
      byAnim[name].push(trimmed);
      indexMap.push({ name, localIdx: byAnim[name].length - 1 });
      allTrimmed.push(trimmed);
    }
  }

  if (!allTrimmed.length) return {};

  const packed = clean
    ? packFramesClean(allTrimmed, maxW, maxH, bakeOutline, { bottomAlign })
    : packFramesUniform(allTrimmed, maxW, maxH);
  const out = {};
  for (let i = 0; i < packed.length; i++) {
    const { name, localIdx } = indexMap[i];
    if (!out[name]) out[name] = [];
    out[name][localIdx] = packed[i];
  }
  return out;
}

/** Load per-anim sheets: sheets/player-cat-rocket-<anim>.png */
async function loadPerAnimSheets(
  meta,
  animNames,
  maxW,
  maxH,
  { bottomAlign = false, bakeOutline = PLAYER_BAKE_OUTLINE } = {}
) {
  const per = meta?.perAnimSheets;
  if (!per) return null;
  const allTrimmed = [];
  const indexMap = [];
  for (const name of animNames) {
    const info = per[name];
    if (!info?.file) continue;
    const img = await loadOptional(assetUrl(`${IMAGINE}/sheets/${info.file}`));
    if (!img) continue;
    const cols = info.cols || 1;
    const cell = info.cell || Math.floor(img.width / cols);
    for (let c = 0; c < cols; c++) {
      const cellCanvas = document.createElement("canvas");
      cellCanvas.width = cell;
      cellCanvas.height = info.cell || img.height;
      const ctx = cellCanvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, c * cell, 0, cell, cellCanvas.height, 0, 0, cell, cellCanvas.height);
      const trimmed = punchTrimFrame(cellCanvas);
      if (!trimmed) continue;
      indexMap.push({ name, localIdx: indexMap.filter((m) => m.name === name).length });
      allTrimmed.push(trimmed);
    }
  }
  if (!allTrimmed.length) return null;
  const packed = packFramesClean(allTrimmed, maxW, maxH, bakeOutline, { bottomAlign });
  const out = {};
  for (let i = 0; i < packed.length; i++) {
    const { name, localIdx } = indexMap[i];
    if (!out[name]) out[name] = [];
    out[name][localIdx] = packed[i];
  }
  return out;
}

function loadCharacterFromSheet(sheetImg, meta, maxW, maxH) {
  if (!sheetImg || !meta) return null;
  const frames = sliceSheet(
    sheetImg,
    meta.cols,
    meta.rows || 1,
    maxW,
    maxH,
    meta.cell
  );
  if (!frames.length) return null;
  return mapAnims(frames, meta.anims);
}

/** @deprecated use frameAt from anim.js - kept for call sites */
export function animFrame(anims, state, frame, fallback = null) {
  if (!anims) return fallback;
  const list = anims[state] || anims.idle || anims.fly || anims.walk || Object.values(anims)[0];
  if (!list || !list.length) return fallback;
  return list[Math.floor(Math.abs(frame)) % list.length] || fallback;
}

export const Art = {
  ready: false,
  landscape: null,
  catRocket: null,
  drone: null,
  /** @type {Record<string, HTMLCanvasElement[]>|null} */
  playerAnims: null,
  /** @type {Record<string, HTMLCanvasElement[]>|null} */
  droneAnims: null,
  /** @type {Record<string, HTMLCanvasElement[]>|null} */
  cyborgAnims: null,
  /** @type {Record<string, HTMLCanvasElement[]>|null} */
  optimusAnims: null,
  /** @type {Record<string, HTMLCanvasElement[]>|null} */
  carbotAnims: null,
  /** @type {Record<string, HTMLCanvasElement[]>|null} */
  rocketAnims: null,
  /** @type {Record<string, HTMLCanvasElement[]>|null} */
  bladeAnims: null,
  playerHolds: null,
  droneHolds: null,
  cyborgHolds: null,
  optimusHolds: null,
  carbotHolds: null,
  rocketHolds: null,
  bladeHolds: null,
  animDefaults: null,
  sheetManifest: null,
  /** Cache-bust token applied to Imagine sprite URLs */
  cacheVer: "drone-half-size-20260720",
  // Reference cyberpunk plates
  refSunset: null,
  refNight: null,
  refTrain: null,
  // Baked neon layers
  neon: null,
  /** Cake Realm parallax plates (Imagine + procedural fallback) */
  cake: null,
  /** Boring Company parallax plates (Imagine + procedural fallback) */
  boring: null,
  /** Neuralink OR parallax plates (Imagine + procedural fallback) */
  neuralink: null,
  /** Tesla Works parallax plates (Imagine + procedural fallback) */
  tesla: null,
  /** SpaceX Ascent parallax plates (Imagine + procedural fallback) */
  spacex: null,
  /** Moon Bouncing parallax plates (Imagine + procedural fallback) */
  moon: null,
  // PixelWhale backgrounds (secondary)
  bgSky: null,
  bgSunset: null,
  bgSpace: null,
  bgCity: null,
  bgClouds: null,
  bgEntry1: null,
  bgEntry2: null,
  bgEntry3: null,
  bgWall: null,
  bgStone: null,
  bgTopCity: null,
  // Characters
  soldierStand: null,
  soldierWalk: [],
  soldierShoot: null,
  /** Tesla Optimus idle frame */
  optimus: null,
  /** Level 3 Tesla car-droid boss idle frame */
  carbot: null,
  /** Level 4 SpaceX rocket boss idle frame */
  rocket: null,
  piskel: null,
  // Props / objects
  cyberCity: null,
  cyberCity2: null,
  firePlanet: null,
  icePlanet: null,
  props: [],
  // Tiles
  tileGround: null,
  tilePlat: null,
  tileMetal: null,
  tileset: null,
  // UI
  uiFrame: null,
  uiPanel: null,
  gunIcon: null,
  cables: null,
  powerups: null,
  /** Three.js-baked candy cane overlay (legacy - slash now uses pinkSword). */
  candyCane: null,
  /** Three.js-baked pink sword for slash swing + afterimage (bake-pink-sword-3d.mjs). */
  pinkSword: null,
  /** Three.js pink heart Y-turntable frames for Elove note (clue) pickups. */
  clueHeartFrames: null,
};

/** Downscale a large plate for crisp parallax without huge GPU uploads. */
function scalePlate(img, maxW = 960) {
  if (!img) return null;
  const scale = Math.min(1, maxW / img.width);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, w, h);
  return c;
}

/**
 * Lit-tunnel grade: pull magenta/pink leftovers toward concrete + amber/cyan
 * so Imagine plates stay Boring Company (ochre/teal rocks, warm lights).
 */
function coolBoringPlate(img) {
  if (!img) return null;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];
    const pinkish = r > g + 25 && r > 120 && b > 90 && g < 190;
    const purpleish = r > 100 && b > r - 10 && g < r - 20 && g < b - 20;
    if (pinkish || purpleish) {
      const l = 0.32 * r + 0.48 * g + 0.2 * b;
      r = Math.round(l * 0.35 + 220 * 0.65);
      g = Math.round(l * 0.32 + 226 * 0.68);
      b = Math.round(l * 0.3 + 232 * 0.7);
    } else {
      // Lift toward pale white concrete; keep cyan accents
      const cyanish = b > r + 15 && g > r;
      if (cyanish) {
        r = Math.min(255, Math.round(r * 0.85 + 200 * 0.15));
        g = Math.min(255, Math.round(g * 0.88 + 220 * 0.12 + 4));
        b = Math.min(255, Math.round(b * 0.9 + 230 * 0.1 + 6));
      } else {
        r = Math.min(255, Math.round(r * 0.42 + 228 * 0.58));
        g = Math.min(255, Math.round(g * 0.42 + 232 * 0.58));
        b = Math.min(255, Math.round(b * 0.4 + 238 * 0.6));
      }
    }
    d[i] = Math.min(255, r);
    d[i + 1] = Math.min(255, g);
    d[i + 2] = Math.min(255, b);
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/**
 * Sterile Neuralink grade: pull hot magenta/purple leftovers toward cool
 * teal-white OR tones while preserving soft rose brain accents.
 */
function coolNeuralinkPlate(img) {
  if (!img) return null;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];
    const hotPink = r > g + 40 && r > 150 && b > 100 && g < 140;
    const purpleish = r > 100 && b > r - 10 && g < r - 25 && g < b - 25;
    if (hotPink || purpleish) {
      const l = 0.3 * r + 0.5 * g + 0.2 * b;
      r = Math.round(l * 0.5 + 180 * 0.25);
      g = Math.round(l * 0.55 + 200 * 0.28);
      b = Math.round(l * 0.48 + 210 * 0.3);
    } else {
      // Mild cool teal shift on neutrals; keep rose-ish soft
      const rose = r > g + 10 && r > b && g > 120 && r < 230;
      if (!rose) {
        r = Math.round(r * 0.94);
        g = Math.min(255, Math.round(g * 1.02 + 3));
        b = Math.min(255, Math.round(b * 1.03 + 4));
      }
    }
    d[i] = Math.min(255, r);
    d[i + 1] = Math.min(255, g);
    d[i + 2] = Math.min(255, b);
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/**
 * Cool Tesla grade: pull magenta/pink toward silver-blue so Imagine plates
 * stay Gigafactory (grey/white/blue/red) instead of cake-neon.
 */
function coolTeslaPlate(img) {
  if (!img) return null;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];
    const pinkish = r > g + 25 && r > 120 && b > 90 && g < 190;
    const purpleish = r > 100 && b > r - 10 && g < r - 20 && g < b - 20;
    if (pinkish || purpleish) {
      // Desaturate toward cool steel
      const l = 0.3 * r + 0.5 * g + 0.2 * b;
      r = Math.round(l * 0.55 + 160 * 0.25 + 62 * 0.08);
      g = Math.round(l * 0.6 + 180 * 0.25);
      b = Math.round(l * 0.45 + 210 * 0.35 + 40);
    } else {
      // Mild cool shift on neutrals
      r = Math.round(r * 0.92);
      g = Math.round(g * 0.96 + 4);
      b = Math.min(255, Math.round(b * 1.04 + 6));
    }
    d[i] = Math.min(255, r);
    d[i + 1] = Math.min(255, g);
    d[i + 2] = Math.min(255, b);
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/**
 * Night Starbase grade: pull warm pink leftovers toward navy/steel/cyan
 * so Imagine plates stay SpaceX (navy/steel/orange) instead of cake-neon.
 */
function coolSpaceXPlate(img) {
  if (!img) return null;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];
    const pinkish = r > g + 25 && r > 120 && b > 90 && g < 190;
    const purpleish = r > 100 && b > r - 10 && g < r - 20 && g < b - 20;
    if (pinkish || purpleish) {
      const l = 0.28 * r + 0.48 * g + 0.24 * b;
      r = Math.round(l * 0.35 + 28);
      g = Math.round(l * 0.48 + 58);
      b = Math.round(l * 0.58 + 118);
    } else {
      // Mild night cool: deepen blues, keep steel highlights
      r = Math.round(r * 0.86);
      g = Math.round(g * 0.92 + 2);
      b = Math.min(255, Math.round(b * 1.08 + 10));
    }
    d[i] = Math.min(255, r);
    d[i + 1] = Math.min(255, g);
    d[i + 2] = Math.min(255, b);
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/**
 * Lunar grade: pull hot pink leftovers toward cool grey/cyan
 * so Imagine plates stay Moon (ash/steel/cyan) instead of cake-neon.
 */
function coolMoonPlate(img) {
  if (!img) return null;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];
    const pinkish = r > g + 25 && r > 120 && b > 90 && g < 190;
    const purpleish = r > 100 && b > r - 10 && g < r - 20 && g < b - 20;
    if (pinkish || purpleish) {
      const l = 0.3 * r + 0.45 * g + 0.25 * b;
      r = Math.round(l * 0.55 + 40);
      g = Math.round(l * 0.58 + 48);
      b = Math.round(l * 0.62 + 70);
    } else {
      r = Math.round(r * 0.92 + 4);
      g = Math.round(g * 0.94 + 4);
      b = Math.min(255, Math.round(b * 1.04 + 6));
    }
    d[i] = Math.min(255, r);
    d[i + 1] = Math.min(255, g);
    d[i + 2] = Math.min(255, b);
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

export async function preloadArt() {
  const { bakeNeonSet } = await import("./neon.js?v=deploy-assets-20261111");

  const propPaths = [];
  for (let i = 1; i <= 34; i++) {
    propPaths.push(`${PW}/prop-${String(i).padStart(2, "0")}.png`);
  }

  let sheetManifest = null;
  try {
    // Always revalidate so ART_CACHE tracks the latest sprite bake.
    const res = await fetch(`${IMAGINE}/sheets/manifest.json?_=${Date.now()}`, {
      cache: "no-store",
    });
    if (res.ok) sheetManifest = await res.json();
  } catch (_) {}
  ART_CACHE = sheetManifest?.generatedAt || String(Date.now());
  Art.sheetManifest = sheetManifest;
  Art.cacheVer = ART_CACHE;

  const [
    landscape,
    sheetPlayer,
    sheetDrone,
    sheetCyborg,
    sheetBlade,
    refSunset,
    refNight,
    refTrain,
    bgSky,
    bgSunset,
    bgSpace,
    bgCity,
    bgClouds,
    bgEntry1,
    bgEntry2,
    bgEntry3,
    bgWall,
    bgStone,
    bgTopCity,
    piskel,
    cyberCity,
    cyberCity2,
    firePlanet,
    icePlanet,
    tilePurple,
    tileCyan,
    tileMetal,
    tileset,
    uiFrame,
    uiPanel,
    ...propImgs
  ] = await Promise.all([
    loadOptional(`${BASE}/nars-landscape.jpg`),
    loadOptional(assetUrl(`${IMAGINE}/sheets/player-cat-rocket.png`)),
    loadOptional(assetUrl(`${IMAGINE}/sheets/enemy-drone.png`)),
    loadOptional(assetUrl(`${IMAGINE}/sheets/enemy-cyborg.png`)),
    loadOptional(assetUrl(`${IMAGINE}/sheets/pickup-blade.png`)),
    loadOptional("assets/ref-bg/cyber-sunset-env.png"),
    loadOptional("assets/ref-bg/cyber-night-env.png"),
    loadOptional("assets/ref-bg/cyber-train-env.png"),
    loadOptional(`${PW}/bg-sky.png`),
    loadOptional(`${PW}/bg-sunset.png`),
    loadOptional(`${PW}/bg-space.png`),
    loadOptional(`${PW}/bg-city.png`),
    loadOptional(`${PW}/bg-clouds.png`),
    loadOptional(`${PW}/bg-entry1.png`),
    loadOptional(`${PW}/bg-entry2.png`),
    loadOptional(`${PW}/bg-entry3.png`),
    loadOptional(`${PW}/bg-wall.png`),
    loadOptional(`${PW}/bg-stone.png`),
    loadOptional(`${PW}/bg-topcity.png`),
    loadOptional(`${PW}/piskel.png`),
    loadOptional(`${PW}/cyber-city.png`),
    loadOptional(`${PW}/cyber-city2.png`),
    loadOptional(`${PW}/fire-planet.png`),
    loadOptional(`${PW}/ice-planet.png`),
    loadOptional(`${PW}/tile-purple.png`),
    loadOptional(`${PW}/tile-cyan.png`),
    loadOptional(`${PW}/tile-metal.png`),
    loadOptional(`${PW}/tileset.png`),
    loadOptional(`${PW}/ui-frame.png`),
    loadOptional(`${PW}/ui-panel.png`),
    ...propPaths.map(loadOptional),
  ]);

  Art.landscape = landscape;
  const man = sheetManifest?.sheets || {};
  const { DEFAULT_HOLDS } = await import("./anim.js");
  Art.animDefaults = { ...DEFAULT_HOLDS, ...(sheetManifest?.defaults || {}) };

  // Player: prefer clean per-anim Grok video frames (no pixel harden), then
  // per-anim sheets, then legacy combined sheet.
  const playerMeta = man["player-cat-rocket"];
  const playerClean =
    playerMeta?.source === "grok-video-per-anim-clean" ||
    playerMeta?.pixelate === false ||
    sheetManifest?.playerPipeline?.mode === "per-anim-clean";
  const playerAnimNames = ["idle", "fly", "slash", "hurt"];
  let playerAnims = null;
  if (playerClean) {
    // Named frames are full video extracts - better silhouette fill than 256 sheets
    playerAnims = await loadVideoAnimDir(
      "player-cat-rocket",
      playerAnimNames,
      PLAYER_TARGET_W,
      PLAYER_TARGET_H,
      { clean: true }
    );
    if (!playerAnims || !Object.keys(playerAnims).length) {
      playerAnims = await loadPerAnimSheets(
        playerMeta,
        playerAnimNames,
        PLAYER_TARGET_W,
        PLAYER_TARGET_H
      );
    }
  }
  if (!playerAnims || !Object.keys(playerAnims).length) {
    const playerSheet = loadCharacterFromSheet(
      sheetPlayer,
      playerMeta,
      PLAYER_TARGET_W,
      PLAYER_TARGET_H
    );
    const playerVideo = playerSheet
      ? {}
      : await loadVideoAnimDir(
          "player-cat-rocket",
          playerAnimNames,
          PLAYER_TARGET_W,
          PLAYER_TARGET_H,
          { clean: true }
        );
    playerAnims =
      playerSheet ||
      (Object.keys(playerVideo).length ? playerVideo : null);
  }
  Art.playerAnims = playerAnims;
  Art.playerHolds = playerMeta?.holdMs || {
    idle: 450,
    fly: 180,
    slash: [160, 110, 70, 150],
    hurt: 140,
  };
  Art.catRocket = Art.playerAnims?.idle?.[0] || Art.playerAnims?.fly?.[0] || null;
  Art.playerPipeline = sheetManifest?.playerPipeline || {
    mode: playerClean ? "per-anim-clean" : "legacy",
    pixelate: !playerClean,
  };
  // Elove - same silhouette as player, black-cat recolor (idle loop for waiting NPC)
  const eloveSrc =
    Art.playerAnims?.idle?.length
      ? Art.playerAnims.idle
      : Art.catRocket
        ? [Art.catRocket]
        : [];
  Art.eloveAnims = {
    idle: eloveSrc.map((f) => tintToBlackCat(f)).filter(Boolean),
  };
  Art.elove = Art.eloveAnims.idle[0] || null;

  const enemyClean =
    sheetManifest?.enemyPipeline?.mode === "per-anim-clean" ||
    sheetManifest?.enemyPipeline?.pixelate === false;

  const droneMeta = man["enemy-drone"] || {
    cols: 9,
    rows: 1,
    cell: 128,
    anims: { fly: [0, 1, 2, 3, 4, 5], hurt: [6, 7, 8] },
  };
  const droneAnimNames = ["fly", "hurt"];
  const droneClean =
    enemyClean ||
    droneMeta?.source === "grok-video-per-anim-clean" ||
    droneMeta?.pixelate === false;
  let droneAnims = null;
  // Archive Grok drone art has no baked black rim - skip outline so charcoal
  // body + neon accents match early screenshots (outline made it look inked).
  const droneBakeOutline = false;
  if (droneClean) {
    droneAnims = await loadVideoAnimDir(
      "enemy-drone",
      droneAnimNames,
      DRONE_TARGET_W,
      DRONE_TARGET_H,
      { clean: true, bakeOutline: droneBakeOutline }
    );
    if (!droneAnims || !Object.keys(droneAnims).length) {
      droneAnims = await loadPerAnimSheets(
        droneMeta,
        droneAnimNames,
        DRONE_TARGET_W,
        DRONE_TARGET_H,
        { bakeOutline: droneBakeOutline }
      );
    }
  }
  if (!droneAnims || !Object.keys(droneAnims).length) {
    const droneSheet = loadCharacterFromSheet(
      sheetDrone,
      droneMeta,
      DRONE_TARGET_W,
      DRONE_TARGET_H
    );
    const droneVideo = droneSheet
      ? {}
      : await loadVideoAnimDir(
          "enemy-drone",
          droneAnimNames,
          DRONE_TARGET_W,
          DRONE_TARGET_H,
          { bakeOutline: droneBakeOutline }
        );
    droneAnims =
      droneSheet || (Object.keys(droneVideo).length ? droneVideo : null);
  }
  Art.droneAnims = droneAnims;
  Art.droneHolds = droneMeta?.holdMs || { fly: 180, hurt: 120 };
  Art.drone = Art.droneAnims?.fly?.[0] || null;

  const cyborgMeta = man["enemy-cyborg"] || {
    cols: 10,
    rows: 1,
    cell: 128,
    anims: { idle: [0, 1], walk: [2, 3, 4, 5], attack: [6, 7], hurt: [8, 9] },
  };
  const cyborgAnimNames = ["idle", "walk", "attack", "hurt"];
  const cyborgClean =
    enemyClean ||
    cyborgMeta?.source === "grok-video-per-anim-clean" ||
    cyborgMeta?.pixelate === false;
  let cyborgAnims = null;
  if (cyborgClean) {
    cyborgAnims = await loadVideoAnimDir(
      "enemy-cyborg",
      cyborgAnimNames,
      SOLDIER_TARGET_W,
      SOLDIER_TARGET_H,
      { clean: true, bottomAlign: true }
    );
    if (!cyborgAnims || !Object.keys(cyborgAnims).length) {
      cyborgAnims = await loadPerAnimSheets(
        cyborgMeta,
        cyborgAnimNames,
        SOLDIER_TARGET_W,
        SOLDIER_TARGET_H,
        { bottomAlign: true }
      );
    }
  }
  if (!cyborgAnims || !Object.keys(cyborgAnims).length) {
    const cyborgSheet = loadCharacterFromSheet(
      sheetCyborg,
      cyborgMeta,
      SOLDIER_TARGET_W,
      SOLDIER_TARGET_H
    );
    const cyborgVideo = cyborgSheet
      ? {}
      : await loadVideoAnimDir(
          "enemy-cyborg",
          cyborgAnimNames,
          SOLDIER_TARGET_W,
          SOLDIER_TARGET_H,
          { bottomAlign: true }
        );
    cyborgAnims =
      cyborgSheet || (Object.keys(cyborgVideo).length ? cyborgVideo : null);
  }
  // Final pass: crop any leftover pad under boots and pin feet to box bottom
  if (cyborgAnims) cyborgAnims = feetCropAnims(cyborgAnims, SOLDIER_TARGET_W, SOLDIER_TARGET_H);
  Art.cyborgAnims = cyborgAnims;
  Art.cyborgHolds = cyborgMeta?.holdMs || { idle: 450, walk: 140, attack: [160, 100, 55, 150], hurt: 120 };
  Art.soldierStand = Art.cyborgAnims?.idle?.[0] || null;
  Art.soldierWalk = Art.cyborgAnims?.walk || [];
  Art.soldierShoot = Art.cyborgAnims?.attack?.[0] || null;

  // Tesla Optimus - same footprint / clean pack path as cyborg
  const optimusMeta = man["enemy-optimus"] || {
    cols: 17,
    rows: 1,
    cell: 256,
    anims: {
      idle: [0, 1, 2, 3],
      walk: [4, 5, 6, 7, 8, 9],
      attack: [10, 11, 12, 13],
      hurt: [14, 15, 16],
    },
  };
  const optimusAnimNames = ["idle", "walk", "attack", "hurt"];
  const optimusClean =
    enemyClean ||
    optimusMeta?.source === "imagine-keyframes-pack-clean" ||
    optimusMeta?.source === "grok-video-per-anim-clean" ||
    optimusMeta?.pixelate === false;
  let optimusAnims = null;
  if (optimusClean) {
    optimusAnims = await loadVideoAnimDir(
      "enemy-optimus",
      optimusAnimNames,
      SOLDIER_TARGET_W,
      SOLDIER_TARGET_H,
      { clean: true, bottomAlign: true }
    );
    if (!optimusAnims || !Object.keys(optimusAnims).length) {
      optimusAnims = await loadPerAnimSheets(
        optimusMeta,
        optimusAnimNames,
        SOLDIER_TARGET_W,
        SOLDIER_TARGET_H,
        { bottomAlign: true }
      );
    }
  }
  if (!optimusAnims || !Object.keys(optimusAnims).length) {
    const sheetOptimus = await loadOptional(
      assetUrl(`${IMAGINE}/sheets/enemy-optimus.png`)
    );
    const optimusSheet = loadCharacterFromSheet(
      sheetOptimus,
      optimusMeta,
      SOLDIER_TARGET_W,
      SOLDIER_TARGET_H
    );
    optimusAnims = optimusSheet || null;
  }
  if (optimusAnims) optimusAnims = feetCropAnims(optimusAnims, SOLDIER_TARGET_W, SOLDIER_TARGET_H);
  Art.optimusAnims = optimusAnims;
  Art.optimusHolds = optimusMeta?.holdMs || {
    idle: 450,
    walk: 140,
    attack: [160, 100, 55, 150],
    hurt: 120,
  };
  Art.optimus = Art.optimusAnims?.idle?.[0] || Art.optimusAnims?.walk?.[0] || null;

  // Tesla car-droid boss - wide chassis, same clean pack path as Optimus
  const carbotMeta = man["enemy-carbot"] || {
    cols: 17,
    rows: 1,
    cell: 256,
    anims: {
      idle: [0, 1, 2, 3],
      walk: [4, 5, 6, 7, 8, 9],
      attack: [10, 11, 12, 13],
      hurt: [14, 15, 16],
    },
  };
  const carbotAnimNames = ["idle", "walk", "attack", "hurt"];
  const carbotClean =
    enemyClean ||
    carbotMeta?.source === "imagine-keyframes-pack-clean" ||
    carbotMeta?.source === "grok-video-per-anim-clean" ||
    carbotMeta?.pixelate === false;
  let carbotAnims = null;
  if (carbotClean) {
    carbotAnims = await loadVideoAnimDir(
      "enemy-carbot",
      carbotAnimNames,
      CARBOT_TARGET_W,
      CARBOT_TARGET_H,
      { clean: true, bottomAlign: true }
    );
    if (!carbotAnims || !Object.keys(carbotAnims).length) {
      carbotAnims = await loadPerAnimSheets(
        carbotMeta,
        carbotAnimNames,
        CARBOT_TARGET_W,
        CARBOT_TARGET_H,
        { bottomAlign: true }
      );
    }
  }
  if (!carbotAnims || !Object.keys(carbotAnims).length) {
    const sheetCarbot = await loadOptional(
      assetUrl(`${IMAGINE}/sheets/enemy-carbot.png`)
    );
    const carbotSheet = loadCharacterFromSheet(
      sheetCarbot,
      carbotMeta,
      CARBOT_TARGET_W,
      CARBOT_TARGET_H
    );
    carbotAnims = carbotSheet || null;
  }
  if (carbotAnims) carbotAnims = feetCropAnims(carbotAnims, CARBOT_TARGET_W, CARBOT_TARGET_H);
  Art.carbotAnims = carbotAnims;
  Art.carbotHolds = carbotMeta?.holdMs || {
    idle: 420,
    walk: 120,
    attack: [180, 90, 70, 160],
    hurt: 110,
  };
  Art.carbot = Art.carbotAnims?.idle?.[0] || Art.carbotAnims?.walk?.[0] || null;

  // SpaceX rocket boss - tall Starship, same clean pack path as Carbot
  const rocketMeta = man["enemy-rocket"] || {
    cols: 17,
    rows: 1,
    cell: 256,
    anims: {
      idle: [0, 1, 2, 3],
      walk: [4, 5, 6, 7, 8, 9],
      attack: [10, 11, 12, 13],
      hurt: [14, 15, 16],
    },
  };
  const rocketAnimNames = ["idle", "walk", "attack", "hurt"];
  const rocketClean =
    enemyClean ||
    rocketMeta?.source === "imagine-keyframes-pack-clean" ||
    rocketMeta?.source === "grok-video-per-anim-clean" ||
    rocketMeta?.pixelate === false;
  let rocketAnims = null;
  if (rocketClean) {
    rocketAnims = await loadVideoAnimDir(
      "enemy-rocket",
      rocketAnimNames,
      ROCKET_TARGET_W,
      ROCKET_TARGET_H,
      { clean: true, bottomAlign: true }
    );
    if (!rocketAnims || !Object.keys(rocketAnims).length) {
      rocketAnims = await loadPerAnimSheets(
        rocketMeta,
        rocketAnimNames,
        ROCKET_TARGET_W,
        ROCKET_TARGET_H,
        { bottomAlign: true }
      );
    }
  }
  if (!rocketAnims || !Object.keys(rocketAnims).length) {
    const sheetRocket = await loadOptional(
      assetUrl(`${IMAGINE}/sheets/enemy-rocket.png`)
    );
    const rocketSheet = loadCharacterFromSheet(
      sheetRocket,
      rocketMeta,
      ROCKET_TARGET_W,
      ROCKET_TARGET_H
    );
    rocketAnims = rocketSheet || null;
  }
  if (rocketAnims) rocketAnims = feetCropAnims(rocketAnims, ROCKET_TARGET_W, ROCKET_TARGET_H);
  Art.rocketAnims = rocketAnims;
  Art.rocketHolds = rocketMeta?.holdMs || {
    idle: 420,
    walk: 120,
    attack: [180, 90, 70, 160],
    hurt: 110,
  };
  Art.rocket = Art.rocketAnims?.idle?.[0] || Art.rocketAnims?.walk?.[0] || null;

  Art.enemyPipeline = sheetManifest?.enemyPipeline || {
    mode:
      droneClean || cyborgClean || optimusClean || carbotClean || rocketClean
        ? "per-anim-clean"
        : "legacy",
    pixelate: !(droneClean || cyborgClean || optimusClean || carbotClean || rocketClean),
  };

  const bladeMeta = man["pickup-blade"] || {
    cols: 10,
    rows: 1,
    cell: 128,
    anims: { spin: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
  };
  const bladeSheet = loadCharacterFromSheet(sheetBlade, bladeMeta, BLADE_TARGET_W, BLADE_TARGET_H);
  const bladeVideo = bladeSheet
    ? {}
    : await loadVideoAnimDir("pickup-blade", ["spin"], BLADE_TARGET_W, BLADE_TARGET_H);
  Art.bladeAnims =
    bladeSheet ||
    (Object.keys(bladeVideo).length ? bladeVideo : null);
  Art.bladeHolds = bladeMeta?.holdMs || { spin: 130 };
  Art.gunIcon = Art.bladeAnims?.spin?.[0] || null;

  if (!Art.playerAnims) console.warn("Missing Grok video player sprites");
  if (!Art.droneAnims) console.warn("Missing Grok video drone sprites");
  if (!Art.cyborgAnims) console.warn("Missing Grok video cyborg sprites");
  if (!Art.optimusAnims) console.warn("Missing Optimus enemy sprites");
  if (!Art.carbotAnims) console.warn("Missing Carbot boss sprites");
  if (!Art.rocketAnims) console.warn("Missing Rocket boss sprites");

  Art.refSunset = refSunset;
  Art.refNight = refNight;
  Art.refTrain = refTrain;
  Art.neon = bakeNeonSet();

  // Cake Realm parallax - Grok Imagine / GenerateImage plates with neon bake fallback
  const cakeVer = "cake-candies-20260815";
  const pastryFiles = [
    "pastry-cupcake.png",
    "pastry-macaron.png",
    "pastry-croissant.png",
    "pastry-donut.png",
    "pastry-slice.png",
  ];
  const candyFiles = [
    { kind: "lollipop", file: "candy-lollipop.png" },
    { kind: "candy-cane", file: "candy-cane.png" },
    { kind: "gumdrop", file: "candy-gumdrop.png" },
    { kind: "wrapped-chocolate", file: "candy-wrapped-chocolate.png" },
    { kind: "jelly-bean", file: "candy-jelly-bean.png" },
    { kind: "hard", file: "candy-hard.png" },
  ];
  const [
    cakeSkyImg,
    cakeMtnImg,
    cakeMidImg,
    cakeCloudImg,
    cakeFgImg,
    ...cakeExtraImgs
  ] = await Promise.all([
    loadOptional(`${IMAGINE}/cake/cake-sky-far.png?v=${cakeVer}`),
    loadOptional(`${IMAGINE}/cake/cake-mountains.png?v=${cakeVer}`),
    loadOptional(`${IMAGINE}/cake/cake-midscape.png?v=${cakeVer}`),
    loadOptional(`${IMAGINE}/cake/cake-cloud.png?v=${cakeVer}`),
    loadOptional(`${IMAGINE}/cake/cake-fg-accent.png?v=${cakeVer}`),
    ...pastryFiles.map((f) =>
      loadOptional(`${IMAGINE}/cake/${f}?v=${cakeVer}`)
    ),
    ...candyFiles.map((c) =>
      loadOptional(`${IMAGINE}/cake/${c.file}?v=${cakeVer}`)
    ),
  ]);
  const pastryImgs = cakeExtraImgs.slice(0, pastryFiles.length);
  const candyImgs = cakeExtraImgs.slice(pastryFiles.length);

  function prepCakeFloater(img, maxW = 96) {
    if (!img) return null;
    const punched = punchBlack(img, 28);
    const trimmed = trimAlpha(punched);
    // Nearest-neighbor downscale for chunky pixel look
    const scale = Math.min(1, maxW / Math.max(trimmed.width, trimmed.height));
    const w = Math.max(8, Math.round(trimmed.width * scale));
    const h = Math.max(8, Math.round(trimmed.height * scale));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(trimmed, 0, 0, w, h);
    return c;
  }

  const cakeBake = Art.neon.cake || {};
  const pastries = pastryImgs.map((img) => prepCakeFloater(img, 96)).filter(Boolean);
  Art.cake = {
    sky: scalePlate(cakeSkyImg, 960) || cakeBake.sky,
    mountains: scalePlate(cakeMtnImg, 960) || cakeBake.mountains,
    midscape: scalePlate(cakeMidImg, 960) || cakeBake.midscape,
    cloud: cakeCloudImg
      ? prepCakeFloater(cakeCloudImg, 96)
      : cakeBake.cloud,
    pastries: pastries.length ? pastries : cakeBake.pastries || [],
    foreground: cakeFgImg
      ? scalePlate(punchBlack(cakeFgImg, 22), 960)
      : cakeBake.foreground,
  };

  /** Fit candy Imagine plate into a fixed box with silhouette outline (same as legacy toffee). */
  function prepCandyCollectible(img) {
    if (!img) return null;
    const cleared = punchPlateEdges(imgToCanvas(img));
    const trimmed = trimAlpha(cleared);
    const box = 40;
    const pad = 2;
    const fit = Math.min(
      (box - pad) / Math.max(1, trimmed.width),
      (box - pad) / Math.max(1, trimmed.height)
    );
    const w = Math.max(1, Math.round(trimmed.width * fit));
    const h = Math.max(1, Math.round(trimmed.height * fit));
    const scaled = document.createElement("canvas");
    scaled.width = w;
    scaled.height = h;
    const sctx = scaled.getContext("2d");
    sctx.imageSmoothingEnabled = false;
    sctx.clearRect(0, 0, w, h);
    sctx.drawImage(trimmed, 0, 0, w, h);
    const outlined = bakeHardOutline(scaled, SPRITE_OUTLINE_COLOR);
    const c = document.createElement("canvas");
    c.width = box;
    c.height = box;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, box, box);
    ctx.drawImage(
      outlined,
      ((box - outlined.width) / 2) | 0,
      ((box - outlined.height) / 2) | 0
    );
    return c;
  }

  const candyMap = {};
  for (let i = 0; i < candyFiles.length; i++) {
    const { kind } = candyFiles[i];
    const prepared = prepCandyCollectible(candyImgs[i]);
    if (prepared) candyMap[kind] = prepared;
  }
  // Merged into Art.powerups after neon powerups init below
  const cakeCandyCollectibles = { candyMap, candyFiles };

  // Boring Company parallax - real tunnel bore + horizon Loop traffic
  const boringVer = "tunnel-drill-left-20260809";
  const rockFiles = [
    "boring-rock-boulder.png",
    "boring-rock-slab.png",
    "boring-rock-jagged.png",
    "boring-rock-round.png",
  ];
  const boringVehicleFiles = [
    "boring-loop-sedan.png",
    "boring-loop-cyber.png",
    "boring-loop-pod.png",
    "boring-loop-roadster.png",
  ];
  const [
    boringSkyImg,
    boringTunnelImg,
    boringMidImg,
    boringFgImg,
    boringDrillImg,
    ...boringExtra
  ] = await Promise.all([
    loadOptional(`${IMAGINE}/boring/boring-sky-far.png?v=${boringVer}`),
    loadOptional(`${IMAGINE}/boring/boring-tunnel-far.png?v=${boringVer}`),
    loadOptional(`${IMAGINE}/boring/boring-midscape.png?v=${boringVer}`),
    loadOptional(`${IMAGINE}/boring/boring-fg-accent.png?v=${boringVer}`),
    loadOptional(`${IMAGINE}/boring/boring-drill.png?v=${boringVer}`),
    ...rockFiles.map((f) =>
      loadOptional(`${IMAGINE}/boring/${f}?v=${boringVer}`)
    ),
    ...boringVehicleFiles.map((f) =>
      loadOptional(`${IMAGINE}/boring/${f}?v=${boringVer}`)
    ),
  ]);
  const rockImgs = boringExtra.slice(0, rockFiles.length);
  const boringVehicleImgs = boringExtra.slice(rockFiles.length);

  const boringBake = Art.neon.boring || {};
  const rocks = rockImgs.map((img) => prepCakeFloater(img, 96)).filter(Boolean);
  const boringVehicles = boringVehicleImgs
    .map((img) => prepCakeFloater(img, 96))
    .filter(Boolean);
  Art.boring = {
    sky: coolBoringPlate(scalePlate(boringSkyImg, 960)) || boringBake.sky,
    tunnel:
      coolBoringPlate(scalePlate(boringTunnelImg, 960)) || boringBake.tunnel,
    midscape:
      coolBoringPlate(scalePlate(boringMidImg, 960)) || boringBake.midscape,
    rocks: rocks.length ? rocks : boringBake.rocks || [],
    vehicles: boringVehicles.length
      ? boringVehicles
      : boringBake.vehicles || [],
    drill: boringDrillImg
      ? coolBoringPlate(scalePlate(punchBlack(boringDrillImg, 18), 640))
      : boringBake.drill,
    foreground: boringFgImg
      ? coolBoringPlate(scalePlate(punchBlack(boringFgImg, 22), 960))
      : boringBake.foreground,
  };

  // Neuralink OR parallax - GenerateImage / Grok Imagine plates with neon bake fallback
  const neuralinkVer = "neuralink-or-20260803b";
  const brainFiles = [
    "neuralink-brain-a.png",
    "neuralink-brain-b.png",
    "neuralink-brain-c.png",
    "neuralink-brain-d.png",
  ];
  const [
    neuralinkSkyImg,
    neuralinkOrImg,
    neuralinkMidImg,
    neuralinkFgImg,
    ...brainImgs
  ] = await Promise.all([
    loadOptional(`${IMAGINE}/neuralink/neuralink-sky-far.png?v=${neuralinkVer}`),
    loadOptional(`${IMAGINE}/neuralink/neuralink-or-far.png?v=${neuralinkVer}`),
    loadOptional(`${IMAGINE}/neuralink/neuralink-midscape.png?v=${neuralinkVer}`),
    loadOptional(`${IMAGINE}/neuralink/neuralink-fg-accent.png?v=${neuralinkVer}`),
    ...brainFiles.map((f) =>
      loadOptional(`${IMAGINE}/neuralink/${f}?v=${neuralinkVer}`)
    ),
  ]);

  const neuralinkBake = Art.neon.neuralink || {};
  const brains = brainImgs.map((img) => prepCakeFloater(img, 96)).filter(Boolean);
  Art.neuralink = {
    sky: coolNeuralinkPlate(scalePlate(neuralinkSkyImg, 960)) || neuralinkBake.sky,
    orFar:
      coolNeuralinkPlate(scalePlate(neuralinkOrImg, 960)) || neuralinkBake.orFar,
    midscape:
      coolNeuralinkPlate(scalePlate(neuralinkMidImg, 960)) ||
      neuralinkBake.midscape,
    brains: brains.length ? brains : neuralinkBake.brains || [],
    foreground: neuralinkFgImg
      ? coolNeuralinkPlate(scalePlate(punchBlack(neuralinkFgImg, 22), 960))
      : neuralinkBake.foreground,
  };

  // Tesla Works parallax - GenerateImage / Grok Imagine plates with neon bake fallback
  const teslaVer = "tesla-works-20260722d";
  const vehicleFiles = [
    "tesla-car.png",
    "tesla-cybertruck.png",
    "tesla-roadster.png",
    "tesla-suv.png",
  ];
  const [
    teslaSkyImg,
    teslaFactoryImg,
    teslaMidImg,
    teslaSteamImg,
    teslaFgImg,
    ...vehicleImgs
  ] = await Promise.all([
    loadOptional(`${IMAGINE}/tesla/tesla-sky-far.png?v=${teslaVer}`),
    loadOptional(`${IMAGINE}/tesla/tesla-factory-far.png?v=${teslaVer}`),
    loadOptional(`${IMAGINE}/tesla/tesla-midscape.png?v=${teslaVer}`),
    loadOptional(`${IMAGINE}/tesla/tesla-steam.png?v=${teslaVer}`),
    loadOptional(`${IMAGINE}/tesla/tesla-fg-accent.png?v=${teslaVer}`),
    ...vehicleFiles.map((f) =>
      loadOptional(`${IMAGINE}/tesla/${f}?v=${teslaVer}`)
    ),
  ]);

  const teslaBake = Art.neon.tesla || {};
  const vehicles = vehicleImgs
    .map((img) => prepCakeFloater(img, 96))
    .filter(Boolean);
  Art.tesla = {
    sky: coolTeslaPlate(scalePlate(teslaSkyImg, 960)) || teslaBake.sky,
    factory:
      coolTeslaPlate(scalePlate(teslaFactoryImg, 960)) || teslaBake.factory,
    midscape:
      coolTeslaPlate(scalePlate(teslaMidImg, 960)) || teslaBake.midscape,
    steam: teslaSteamImg
      ? prepCakeFloater(teslaSteamImg, 96)
      : teslaBake.steam,
    vehicles: vehicles.length ? vehicles : teslaBake.vehicles || [],
    foreground: teslaFgImg
      ? coolTeslaPlate(scalePlate(punchBlack(teslaFgImg, 22), 960))
      : teslaBake.foreground,
  };

  // SpaceX Ascent parallax - GenerateImage / Grok Imagine plates with neon bake fallback
  const spacexVer = "l4-starship-parallax-20260804";
  const rocketFiles = [
    "spacex-rocket-starship.png",
    "spacex-rocket-starship-b.png",
    "spacex-rocket-starship-c.png",
    "spacex-rocket-starship-d.png",
    "spacex-rocket-starship-stack.png",
    "spacex-rocket-falcon.png",
    "spacex-rocket-heavy.png",
    "spacex-rocket-crew.png",
  ];
  const nebulaFiles = ["spacex-nebula-a.png", "spacex-nebula-b.png"];
  const [
    spacexSkyImg,
    spacexPadImg,
    spacexMidImg,
    spacexFgImg,
    spacexRocketMoonImg,
    ...rocketAndNebulaImgs
  ] = await Promise.all([
    loadOptional(`${IMAGINE}/spacex/spacex-sky-far.png?v=${spacexVer}`),
    loadOptional(`${IMAGINE}/spacex/spacex-pad-far.png?v=${spacexVer}`),
    loadOptional(`${IMAGINE}/spacex/spacex-midscape.png?v=${spacexVer}`),
    loadOptional(`${IMAGINE}/spacex/spacex-fg-accent.png?v=${spacexVer}`),
    loadOptional(`${IMAGINE}/spacex/spacex-rocket-to-moon.png?v=${spacexVer}`),
    ...rocketFiles.map((f) =>
      loadOptional(`${IMAGINE}/spacex/${f}?v=${spacexVer}`)
    ),
    ...nebulaFiles.map((f) =>
      loadOptional(`${IMAGINE}/spacex/${f}?v=${spacexVer}`)
    ),
  ]);
  const rocketImgs = rocketAndNebulaImgs.slice(0, rocketFiles.length);
  const nebulaImgs = rocketAndNebulaImgs.slice(rocketFiles.length);

  const spacexBake = Art.neon.spacex || {};
  const rockets = rocketImgs
    .map((img) => prepCakeFloater(img, 96))
    .filter(Boolean);
  const nebulas = nebulaImgs
    .map((img) => prepCakeFloater(img, 128))
    .filter(Boolean);
  Art.spacex = {
    // Keep nebula sky colors - skip coolSpaceXPlate (it strips violet/magenta washes)
    sky: scalePlate(spacexSkyImg, 960) || spacexBake.sky,
    pad: coolSpaceXPlate(scalePlate(spacexPadImg, 960)) || spacexBake.pad,
    midscape:
      coolSpaceXPlate(scalePlate(spacexMidImg, 960)) || spacexBake.midscape,
    rockets: rockets.length ? rockets : spacexBake.rockets || [],
    nebulas: nebulas.length ? nebulas : spacexBake.nebulas || [],
    rocketToMoon: spacexRocketMoonImg
      ? prepCakeFloater(spacexRocketMoonImg, 140)
      : spacexBake.rocketToMoon || null,
    foreground: spacexFgImg
      ? coolSpaceXPlate(scalePlate(punchBlack(spacexFgImg, 22), 960))
      : spacexBake.foreground,
  };

  // Moon Bouncing parallax - GenerateImage / Grok Imagine plates with neon bake fallback
  const moonVer = "moon-bouncing-20260805";
  const satFiles = [
    "moon-satellite-a.png",
    "moon-satellite-b.png",
    "moon-satellite-c.png",
    "moon-satellite-d.png",
  ];
  const [
    moonSkyImg,
    moonSurfaceImg,
    moonMidImg,
    moonFgImg,
    moonRailgunImg,
    moonInteriorImg,
    ...satImgs
  ] = await Promise.all([
    loadOptional(`${IMAGINE}/moon/moon-sky-far.png?v=${moonVer}`),
    loadOptional(`${IMAGINE}/moon/moon-surface-far.png?v=${moonVer}`),
    loadOptional(`${IMAGINE}/moon/moon-midscape.png?v=${moonVer}`),
    loadOptional(`${IMAGINE}/moon/moon-fg-accent.png?v=${moonVer}`),
    loadOptional(`${IMAGINE}/moon/moon-railgun.png?v=${moonVer}`),
    loadOptional(`${IMAGINE}/moon/moon-starship-interior.png?v=${moonVer}`),
    ...satFiles.map((f) => loadOptional(`${IMAGINE}/moon/${f}?v=${moonVer}`)),
  ]);

  const moonBake = Art.neon.moon || {};
  const satellites = satImgs.map((img) => prepCakeFloater(img, 96)).filter(Boolean);
  Art.moon = {
    sky: coolMoonPlate(scalePlate(moonSkyImg, 960)) || moonBake.sky,
    surface:
      coolMoonPlate(scalePlate(moonSurfaceImg, 960)) || moonBake.surface,
    midscape: coolMoonPlate(scalePlate(moonMidImg, 960)) || moonBake.midscape,
    satellites: satellites.length ? satellites : moonBake.satellites || [],
    railgun: moonRailgunImg
      ? prepCakeFloater(moonRailgunImg, 120)
      : moonBake.railgun || null,
    starshipInterior: moonInteriorImg
      ? coolMoonPlate(scalePlate(moonInteriorImg, 960))
      : moonBake.starshipInterior || null,
    foreground: moonFgImg
      ? coolMoonPlate(scalePlate(punchBlack(moonFgImg, 22), 960))
      : moonBake.foreground,
  };

  // Inside Starship - cabin parallax + control console + Mars approach + win movies
  const shipVer = "toffee-fix-20260810c";
  const movieFiles = [
    "movie-01-blastoff.png",
    "movie-02-moon-flyby.png",
    "movie-03-deep-space.png",
    "movie-04-mars-arrival.png",
  ];
  const vacationFiles = [
    "vacation-01-mars-city-arrival.png",
    "vacation-02-city-plaza.png",
    "vacation-03-skybridge-sunset.png",
    "vacation-04-dome-night.png",
  ];
  const [
    shipCabinImg,
    shipCabinNearImg,
    shipConsoleImg,
    shipMarsImg,
    movieVideoEl,
    vacationVideoEl,
    ...restShipImgs
  ] = await Promise.all([
    loadOptional(`${IMAGINE}/starship/starship-cabin-far.png?v=${shipVer}`),
    loadOptional(`${IMAGINE}/starship/starship-cabin-near.png?v=${shipVer}`),
    loadOptional(`${IMAGINE}/starship/starship-control-console.png?v=${shipVer}`),
    loadOptional(`${IMAGINE}/starship/starship-mars-approach.png?v=${shipVer}`),
    loadOptionalVideo(
      `${IMAGINE}/starship/movie/mars-love-movie.mp4?v=${shipVer}`
    ),
    loadOptionalVideo(
      `${IMAGINE}/starship/movie/mars-vacation-movie.mp4?v=${shipVer}`
    ),
    ...movieFiles.map((f) =>
      loadOptional(`${IMAGINE}/starship/movie/${f}?v=${shipVer}`)
    ),
    ...vacationFiles.map((f) =>
      loadOptional(`${IMAGINE}/starship/movie/${f}?v=${shipVer}`)
    ),
  ]);
  const movieImgs = restShipImgs.slice(0, movieFiles.length);
  const vacationImgs = restShipImgs.slice(movieFiles.length);
  const shipBake = Art.neon.starship || {};
  const movieCaptions = [
    "Blast off - together",
    "Past the Moon",
    "On our way to Mars",
    "He saved you",
  ];
  const vacationCaptions = [
    "Mars City vacation",
    "Plaza date",
    "Skybridge sunset",
    "Forever on Mars",
  ];
  const movie = movieFiles
    .map((file, i) => {
      const plate = scalePlate(movieImgs[i], 960);
      if (!plate) return null;
      return { file, img: plate, caption: movieCaptions[i] };
    })
    .filter(Boolean);
  const vacation = vacationFiles
    .map((file, i) => {
      const plate = scalePlate(vacationImgs[i], 960);
      if (!plate) return null;
      return { file, img: plate, caption: vacationCaptions[i] };
    })
    .filter(Boolean);
  const videoMsOf = (el, fallback) =>
    el && Number.isFinite(el.duration) && el.duration > 0
      ? Math.round(el.duration * 1000)
      : el
        ? fallback
        : 0;
  Art.starship = {
    cabin: scalePlate(shipCabinImg, 960) || shipBake.cabin || null,
    cabinNear:
      scalePlate(shipCabinNearImg, 960) ||
      Art.moon?.starshipInterior ||
      shipBake.cabinNear ||
      null,
    console: shipConsoleImg
      ? prepCakeFloater(shipConsoleImg, 120)
      : shipBake.console || null,
    mars: scalePlate(shipMarsImg, 960) || shipBake.mars || null,
    movie: movie.length ? movie : shipBake.movie || [],
    vacation: vacation.length ? vacation : [],
    /** Full L5 coda MP4 - white player cat + yellow Elove (preferred over still panels). */
    movieVideo: movieVideoEl || null,
    movieVideoMs: videoMsOf(movieVideoEl, 9200),
    /** Post-arrival vacation coda MP4 - Mars sci-fi city. */
    vacationVideo: vacationVideoEl || null,
    vacationVideoMs: videoMsOf(vacationVideoEl, 9100),
  };

  Art.bgSky = bgSky;
  Art.bgSunset = bgSunset;
  Art.bgSpace = bgSpace;
  Art.bgCity = bgCity;
  Art.bgClouds = bgClouds;
  Art.bgEntry1 = bgEntry1;
  Art.bgEntry2 = bgEntry2;
  Art.bgEntry3 = bgEntry3;
  Art.bgWall = bgWall;
  Art.bgStone = bgStone;
  Art.bgTopCity = bgTopCity;

  Art.piskel = piskel ? prepSprite(piskel, 24, 24) : null;
  Art.cyberCity = prepSprite(cyberCity, 48, 48);
  Art.cyberCity2 = prepSprite(cyberCity2, 40, 40);
  Art.firePlanet = prepSprite(firePlanet, 32, 32);
  Art.icePlanet = prepSprite(icePlanet, 28, 28);

  Art.tileGround = Art.neon.ground;
  Art.tilePlat = Art.neon.platform;
  Art.tilePlatSlip = Art.neon.platformSlip || Art.neon.platform;
  Art.tilePlatBounce = Art.neon.platformBounce || Art.neon.platform;
  Art.tileMetal = tileMetal
    ? scaleTo(punchBlack(tileMetal, 12), TILE_TARGET, TILE_TARGET)
    : Art.neon.ground;
  Art.tileset = tileset;

  Art.uiFrame = uiFrame ? punchBlack(uiFrame, 8) : null;
  Art.uiPanel = uiPanel ? punchBlack(uiPanel, 8) : null;

  Art.cables = Art.neon.cables || [];
  Art.powerups = { ...(Art.neon.powerups || {}) };

  // Cake Realm candy collectibles (Imagine plates under assets/imagine/cake/)
  {
    const { candyMap, candyFiles: kinds } = cakeCandyCollectibles;
    const neonCandies = Art.neon.powerups?.candies || {};
    for (const { kind } of kinds) {
      if (!candyMap[kind] && neonCandies[kind]) candyMap[kind] = neonCandies[kind];
    }
    Art.powerups.candies = candyMap;
    Art.powerups.candy =
      candyMap.lollipop ||
      candyMap[kinds[0]?.kind] ||
      Art.neon.powerups?.candy ||
      null;
    // Legacy alias if anything still looks up toffee
    if (Art.powerups.candy) Art.powerups.toffee = Art.powerups.candy;
  }

  // Three.js -> pixelated neon powerups / guns (transparent alpha; see bake-*-3d.mjs)
  for (const key of [
    "shield",
    "battery",
    "heart",
    "magnet",
    "cable",
    "gun-pistol",
    "gun-blaster",
    "gun-cannon",
    "toy",
    "moon-rock",
    "mars-rock",
    "starship-tile",
    "clue",
    "neuralink-device",
    "gear",
    "engineering",
    "helper-droid",
  ]) {
    const rock = key === "moon-rock" || key === "mars-rock";
    const spacexLoot = key === "starship-tile";
    const teslaLoot =
      key === "gear" || key === "engineering" || key === "helper-droid";
    const collectible =
      key === "toy" ||
      key === "clue" ||
      key === "neuralink-device" ||
      teslaLoot ||
      spacexLoot ||
      rock;
    const img = await loadOptional(
      key === "cable"
        ? assetUrl(`${IMAGINE}/powerups/${key}.png`)
        : rock
          ? `${IMAGINE}/powerups/${key}.png?v=3d-rocks-20260725`
          : collectible
            ? key === "clue"
              ? `${IMAGINE}/powerups/${key}.png?v=cake-candies-20260815`
              : key === "neuralink-device"
                ? `${IMAGINE}/powerups/${key}.png?v=neuralink-device-20260803`
                : teslaLoot
                  ? `${IMAGINE}/powerups/${key}.png?v=l3-tesla-loot-20260804`
                  : spacexLoot
                    ? `${IMAGINE}/powerups/${key}.png?v=l4-elove-ascent-20260804`
                    : `${IMAGINE}/powerups/${key}.png?v=collectibles-20260725`
            : key.startsWith("gun-")
              ? `${IMAGINE}/powerups/${key}.png?v=pink-guns-20260815`
              : `${IMAGINE}/powerups/${key}.png?v=3d-neon-turn-20260719`
    );
    if (img) {
      // Transparent neon bakes - no black punch (preserves glow edges)
      // Imagine plates with solid black BG need punch (Neuralink / L3 Tesla loot / L4 tiles)
      const punch =
        key === "cable" ||
        key === "neuralink-device" ||
        teslaLoot ||
        spacexLoot ||
        key.startsWith("gun-");
      const fixed =
        key === "cable"
          ? prepSpriteFixed(img, 12, 28, true)
          : prepSpriteFixed(img, 24, 24, punch);
      if (key === "cable") {
        Art.cables = [fixed, ...(Art.cables || [])];
      } else {
        Art.powerups[key] = fixed;
      }
    }
  }

  // Grok Imagine platform slabs (grip / slip / bounce) - type-tinted + identity stamp
  const platSpecs = [
    {
      file: "platform-grip.png",
      key: "platform",
      tileKey: "tilePlat",
      kind: "grip",
      floor: [120, 100, 180],
      boxW: 96,
      boxH: 28,
    },
    {
      file: "platform-slip.png",
      key: "platformSlip",
      tileKey: "tilePlatSlip",
      kind: "slip",
      floor: [70, 160, 200],
      boxW: 96,
      boxH: 28,
    },
    {
      file: "platform-bounce.png",
      key: "platformBounce",
      tileKey: "tilePlatBounce",
      kind: "bounce",
      floor: [200, 110, 150],
      boxW: 96,
      boxH: 32,
    },
  ];
  const platLoaded = {};
  for (const spec of platSpecs) {
    const img = await loadOptional(
      `${IMAGINE}/platforms/${spec.file}?v=plat-flat-20260720`
    );
    if (!img) continue;
    // stampPlatformIdentity rebuilds a clean slab (drops Imagine greebles)
    const stamped = stampPlatformIdentity(img, spec.kind);
    const fixed = prepSprite(stamped, spec.boxW, spec.boxH, true);
    if (!fixed) continue;
    Art.neon[spec.key] = fixed;
    Art[spec.tileKey] = fixed;
    platLoaded[spec.key] = { w: fixed.width, h: fixed.height, kind: spec.kind };
  }
  Art.platformsLoaded = platLoaded;

  Art.props = propImgs
    .filter(Boolean)
    .map((img) => prepSprite(img, PROP_TARGET, PROP_TARGET))
    .filter(Boolean);

  // Elove notes -> smooth (non-pixel) pink hearts, 16-frame Y turntable
  {
    const heartVer = "clue-heart-outline-20260810";
    const frames = await Promise.all(
      Array.from({ length: 16 }, (_, i) =>
        loadOptional(
          `${IMAGINE}/powerups/clue-heart/${String(i).padStart(2, "0")}.png?v=${heartVer}`
        )
      )
    );
    /** Smooth fit into box - transparent plate + 1px black outline on the heart only. */
    const prepSmoothHeart = (img, box = 40) => {
      if (!img) return null;
      const src = punchBlack(imgToCanvas(img), 18);
      const trimmed = trimAlpha(src);
      const pad = 2;
      const scale = Math.min((box - pad) / trimmed.width, (box - pad) / trimmed.height);
      const w = Math.max(1, Math.round(trimmed.width * scale));
      const h = Math.max(1, Math.round(trimmed.height * scale));
      const scaled = document.createElement("canvas");
      scaled.width = w;
      scaled.height = h;
      const sctx = scaled.getContext("2d");
      sctx.imageSmoothingEnabled = true;
      sctx.imageSmoothingQuality = "high";
      sctx.drawImage(trimmed, 0, 0, w, h);
      const outlined = bakeHardOutline(scaled, SPRITE_OUTLINE_COLOR);
      const c = document.createElement("canvas");
      c.width = box;
      c.height = box;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, box, box);
      ctx.drawImage(
        outlined,
        ((box - outlined.width) / 2) | 0,
        ((box - outlined.height) / 2) | 0
      );
      return c;
    };
    const prepared = frames.map((img) => prepSmoothHeart(img, 40)).filter(Boolean);
    if (prepared.length) {
      Art.clueHeartFrames = prepared;
      Art.powerups.clue = prepared[0];
    }
  }

  // Pink sword slash (Three.js bake - upright tip-up, swung at runtime)
  {
    const swordImg = await loadOptional(
      `${IMAGINE}/weapons/pink-sword.png?v=toffee-fix-20260810c`
    );
    if (swordImg) {
      Art.pinkSword = prepSpriteFixed(swordImg, 56, 56, false);
    }
    // Keep cane load optional for gallery / fallback tooling
    const caneImg = await loadOptional(
      `${IMAGINE}/weapons/candy-cane.png?v=candy-cane-20260721e`
    );
    if (caneImg) {
      Art.candyCane = prepSpriteFixed(caneImg, 56, 56, false);
    }
  }

  Art.ready = true;
  if (typeof window !== "undefined") {
    window.__ELOVE_ART = {
      player: Art.catRocket ? { w: Art.catRocket.width, h: Art.catRocket.height } : null,
      drone: Art.drone ? { w: Art.drone.width, h: Art.drone.height } : null,
      playerAnims: Art.playerAnims
        ? Object.fromEntries(
            Object.entries(Art.playerAnims).map(([k, v]) => [k, v?.length || 0])
          )
        : null,
      elove: Art.elove ? { w: Art.elove.width, h: Art.elove.height } : null,
      eloveFrames: Art.eloveAnims?.idle?.length || 0,
      starship: Art.starship
        ? {
            cabin: !!Art.starship.cabin,
            console: !!Art.starship.console,
            mars: !!Art.starship.mars,
            movie: Art.starship.movie?.length || 0,
            movieVideo: !!Art.starship.movieVideo,
            movieVideoMs: Art.starship.movieVideoMs || 0,
            vacation: Art.starship.vacation?.length || 0,
            vacationVideo: !!Art.starship.vacationVideo,
            vacationVideoMs: Art.starship.vacationVideoMs || 0,
          }
        : null,
      platforms: Art.platformsLoaded || null,
      pipeline: Art.playerPipeline,
      cacheVer: Art.cacheVer,
      source: Art.sheetManifest?.source || null,
      candyCane: Art.candyCane
        ? { w: Art.candyCane.width, h: Art.candyCane.height }
        : null,
      pinkSword: Art.pinkSword
        ? { w: Art.pinkSword.width, h: Art.pinkSword.height }
        : null,
      clueHeartFrames: Art.clueHeartFrames?.length || 0,
    };
  }
}
