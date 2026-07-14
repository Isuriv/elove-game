/* Load MyPixels + PixelWhale + Grok Imagine sprites */
const BASE = "assets/game";
const PW = "assets/pixelwhale/ready";
const IMAGINE = "assets/imagine";

/** Sprite footprints for the 960×540 framebuffer (smooth HD). */
export const PIXEL_W = 960;
export const PIXEL_H = 540;
export const PLAYER_TARGET_W = 80;
export const PLAYER_TARGET_H = 60;
export const DRONE_TARGET_W = 64;
export const DRONE_TARGET_H = 44;
export const SOLDIER_TARGET_W = 48;
export const SOLDIER_TARGET_H = 64;
export const PROP_TARGET = 40;
export const TILE_TARGET = 32;

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

/** Flood-fill near-black from edges only — keeps dark character bodies. */
export function punchBlackEdges(img, threshold = 28) {
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

/** Opaque content bbox, or null if empty. */
export function contentBounds(src, alphaMin = 8) {
  const ctx = src.getContext("2d");
  const { width: w, height: h } = src;
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > alphaMin) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function median(nums) {
  if (!nums.length) return 0;
  const a = [...nums].sort((x, y) => x - y);
  const m = (a.length / 2) | 0;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function trimAlpha(src) {
  const b = contentBounds(src);
  if (!b) return src;
  const out = document.createElement("canvas");
  out.width = b.w;
  out.height = b.h;
  const octx = out.getContext("2d");
  octx.imageSmoothingEnabled = false;
  octx.drawImage(src, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
  return out;
}

export function fitSmooth(src, maxW, maxH) {
  const scale = Math.min(maxW / src.width, maxH / src.height);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(src.width * scale));
  c.height = Math.max(1, Math.round(src.height * scale));
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export function fitNearest(src, maxW, maxH) {
  const scale = Math.min(maxW / src.width, maxH / src.height);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(src.width * scale));
  c.height = Math.max(1, Math.round(src.height * scale));
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

/** Fit into PIXEL_W×PIXEL_H canvas (transparent pad), nearest-neighbor. */
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
  // Downscale with smooth filtering for HD (non-pixel) art
  const cap = Math.max(PIXEL_W, PIXEL_H);
  const pre = fitSmooth(imgToCanvas(img), Math.min(cap, img.width), Math.min(cap, img.height));
  const punched = punch ? punchBlackEdges(pre, 22) : pre;
  return fitSmooth(trimAlpha(punched), maxW, maxH);
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

/**
 * Slice a sprite sheet into fixed maxW×maxH frames with one shared scale.
 * Avoids per-frame trim+fit (attack flashes enlarge the bbox and shrink the body).
 * Small outliers (camera pullback) are upscaled toward the median subject size.
 *
 * @param {"center"|"bottom"} align  bottom = ground enemies (feet locked)
 */
export function sliceSheet(img, cols, rows, maxW, maxH, cellHint = 0, align = "center") {
  if (!img) return [];
  const cellW = cellHint || Math.floor(img.width / cols);
  const cellH = cellHint || Math.floor(img.height / rows);
  const punched = [];
  const bounds = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("canvas");
      cell.width = cellW;
      cell.height = cellH;
      const ctx = cell.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, c * cellW, r * cellH, cellW, cellH, 0, 0, cellW, cellH);
      const p = punchBlackEdges(cell, 22);
      punched.push(p);
      bounds.push(contentBounds(p));
    }
  }

  const valid = bounds.filter(Boolean);
  if (!valid.length) return [];

  const medW = Math.max(1, median(valid.map((b) => b.w)));
  const medH = Math.max(1, median(valid.map((b) => b.h)));
  const baseScale = Math.min(maxW / medW, maxH / medH) * 0.92;
  const targetH = medH * baseScale;

  const frames = [];
  for (let i = 0; i < punched.length; i++) {
    const out = document.createElement("canvas");
    out.width = maxW;
    out.height = maxH;
    const octx = out.getContext("2d");
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";

    const b = bounds[i];
    if (!b) {
      frames.push(out);
      continue;
    }

    // Same base scale for every frame so proportions stay locked.
    // Only upscale when this frame's subject is clearly smaller (zoom-out).
    let s = baseScale;
    if (b.h * s < targetH * 0.88) s = targetH / b.h;

    let dw = b.w * s;
    let dh = b.h * s;
    // Prefer clipping oversized FX over shrinking the body.
    if (dw > maxW * 1.2 || dh > maxH * 1.2) {
      const fit = Math.min(maxW / b.w, maxH / b.h);
      s = Math.max(baseScale * 0.95, fit);
      dw = b.w * s;
      dh = b.h * s;
    }

    const ox = Math.round((maxW - dw) / 2);
    const oy = align === "bottom" ? Math.round(maxH - dh) : Math.round((maxH - dh) / 2);
    octx.drawImage(punched[i], b.x, b.y, b.w, b.h, ox, oy, Math.round(dw), Math.round(dh));
    frames.push(out);
  }
  return frames;
}

function mapAnims(frames, anims) {
  const out = {};
  for (const [name, idxs] of Object.entries(anims || {})) {
    out[name] = idxs.map((i) => frames[i]).filter(Boolean);
    if (!out[name].length && frames[0]) out[name] = [frames[0]];
  }
  return out;
}

/** Pick a frame; uses ping-pong on multi-frame clips for smoother loops. */
export function animFrame(anims, state, frame, fallback = null) {
  if (!anims) return fallback;
  const list = anims[state] || anims.idle || anims.fly || anims.walk || Object.values(anims)[0];
  if (!list || !list.length) return fallback;
  const n = list.length;
  if (n === 1) return list[0] || fallback;
  // Ping-pong: 0..n-1..0 so consecutive video frames play smoothly both ways
  const cycle = n * 2 - 2;
  let i = Math.floor(Math.abs(frame)) % cycle;
  if (i >= n) i = cycle - i;
  return list[i] || fallback;
}

/** Hold (ms) for a character anim state from sheet manifest. Arrays = per-frame. */
export function animHoldMs(kind, state, fallback = 120, frame = 0) {
  const holds = Art.animHolds?.[kind];
  if (!holds) return fallback;
  const h = holds[state] ?? holds.idle ?? holds.fly ?? holds.walk;
  if (Array.isArray(h)) {
    if (!h.length) return fallback;
    const i = Math.floor(Math.abs(frame)) % h.length;
    return h[i] ?? fallback;
  }
  return typeof h === "number" ? h : fallback;
}

/** Total duration (ms) of one pass through a state's holds. */
export function animDurationMs(kind, state, fallback = 120) {
  const holds = Art.animHolds?.[kind];
  const h = holds?.[state];
  if (Array.isArray(h) && h.length) return h.reduce((a, b) => a + b, 0);
  if (typeof h === "number") {
    const n = Art[`${kind}Anims`]?.[state]?.length || 1;
    return h * n;
  }
  return fallback;
}

/**
 * Advance an abstract frame counter using researched hold timings.
 * `dt` is milliseconds (from main loop).
 */
export function advanceAnimFrame(frame, kind, state, dt) {
  const hold = Math.max(30, animHoldMs(kind, state, 120, frame));
  return frame + dt / hold;
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
  bladeAnims: null,
  /** @type {Record<string, Record<string, number|number[]>>} */
  animHolds: {},
  sheetManifest: null,
  // Reference cyberpunk plates
  refSunset: null,
  refNight: null,
  refTrain: null,
  // Baked neon layers
  neon: null,
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
};

export async function preloadArt() {
  const { bakeNeonSet } = await import("./neon.js");

  const propPaths = [];
  for (let i = 1; i <= 34; i++) {
    propPaths.push(`${PW}/prop-${String(i).padStart(2, "0")}.png`);
  }

  let sheetManifest = null;
  try {
    const res = await fetch(`${IMAGINE}/sheets/manifest.json`);
    if (res.ok) sheetManifest = await res.json();
  } catch (_) {}
  Art.sheetManifest = sheetManifest;

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
    loadOptional(`${IMAGINE}/sheets/player-cat-rocket.png`),
    loadOptional(`${IMAGINE}/sheets/enemy-drone.png`),
    loadOptional(`${IMAGINE}/sheets/enemy-cyborg.png`),
    loadOptional(`${IMAGINE}/sheets/pickup-blade.png`),
    loadImage("assets/ref-bg/cyber-sunset-env.png"),
    loadImage("assets/ref-bg/cyber-night-env.png"),
    loadImage("assets/ref-bg/cyber-train-env.png"),
    loadImage(`${PW}/bg-sky.png`),
    loadImage(`${PW}/bg-sunset.png`),
    loadImage(`${PW}/bg-space.png`),
    loadImage(`${PW}/bg-city.png`),
    loadImage(`${PW}/bg-clouds.png`),
    loadImage(`${PW}/bg-entry1.png`),
    loadImage(`${PW}/bg-entry2.png`),
    loadImage(`${PW}/bg-entry3.png`),
    loadImage(`${PW}/bg-wall.png`),
    loadImage(`${PW}/bg-stone.png`),
    loadImage(`${PW}/bg-topcity.png`),
    loadOptional(`${PW}/piskel.png`),
    loadImage(`${PW}/cyber-city.png`),
    loadImage(`${PW}/cyber-city2.png`),
    loadImage(`${PW}/fire-planet.png`),
    loadImage(`${PW}/ice-planet.png`),
    loadImage(`${PW}/tile-purple.png`),
    loadImage(`${PW}/tile-cyan.png`),
    loadImage(`${PW}/tile-metal.png`),
    loadImage(`${PW}/tileset.png`),
    loadImage(`${PW}/ui-frame.png`),
    loadOptional(`${PW}/ui-panel.png`),
    ...propPaths.map(loadOptional),
  ]);

  Art.landscape = landscape;
  const man = sheetManifest?.sheets || {};
  const defaultHolds = sheetManifest?.defaults || {
    idle: 400,
    float: 150,
    walk: 120,
    attack: 100,
    spin: 110,
  };
  Art.animHolds = {};

  // Characters: ONLY Grok video sprite sheets (no MyPixels / PixelWhale / still fallbacks)
  const requireSheet = (img, name) => {
    if (!img) {
      console.error(`[Art] Missing video sprite sheet: ${name}`);
      return null;
    }
    return img;
  };

  {
    const sheet = requireSheet(sheetPlayer, "sheets/player-cat-rocket.png");
    const meta = man["player-cat-rocket"] || {
      cols: 10,
      rows: 1,
      cell: 256,
      anims: { idle: [0, 1, 2], fly: [2, 3, 4, 5, 6, 7, 8], slash: [9], hurt: [0] },
    };
    const frames = sheet
      ? sliceSheet(sheet, meta.cols, meta.rows || 1, PLAYER_TARGET_W, PLAYER_TARGET_H, meta.cell, "center")
      : [];
    Art.playerAnims = mapAnims(frames, meta.anims);
    Art.catRocket = frames[0] || null;
    Art.animHolds.player = meta.holdMs || {
      idle: defaultHolds.idle,
      fly: defaultHolds.float,
      slash: defaultHolds.attack,
      hurt: 120,
    };
  }

  {
    const sheet = requireSheet(sheetDrone, "sheets/enemy-drone.png");
    const meta = man["enemy-drone"] || {
      cols: 10,
      rows: 1,
      cell: 256,
      anims: { fly: [0, 1, 2, 3, 4, 5, 6, 7], attack: [8, 9], hurt: [4] },
    };
    const frames = sheet
      ? sliceSheet(sheet, meta.cols, meta.rows || 1, DRONE_TARGET_W, DRONE_TARGET_H, meta.cell, "center")
      : [];
    Art.droneAnims = mapAnims(frames, meta.anims);
    Art.drone = frames[0] || null;
    Art.animHolds.drone = meta.holdMs || {
      fly: defaultHolds.float,
      attack: defaultHolds.attack,
      hurt: 100,
    };
  }

  {
    const sheet = requireSheet(sheetCyborg, "sheets/enemy-cyborg.png");
    const meta = man["enemy-cyborg"] || {
      cols: 10,
      rows: 1,
      cell: 256,
      anims: { idle: [0], walk: [1, 2, 3, 4, 5, 6, 7], attack: [8, 9], hurt: [0] },
    };
    const frames = sheet
      ? sliceSheet(sheet, meta.cols, meta.rows || 1, SOLDIER_TARGET_W, SOLDIER_TARGET_H, meta.cell, "bottom")
      : [];
    Art.cyborgAnims = mapAnims(frames, meta.anims);
    Art.soldierStand = frames[0] || null;
    Art.soldierWalk = Art.cyborgAnims?.walk || [];
    Art.soldierShoot = Art.cyborgAnims?.attack?.[0] || frames[frames.length - 1] || null;
    Art.animHolds.cyborg = meta.holdMs || {
      idle: defaultHolds.idle,
      walk: defaultHolds.walk,
      attack: defaultHolds.attack,
      hurt: 100,
    };
  }

  {
    const sheet = requireSheet(sheetBlade, "sheets/pickup-blade.png");
    const meta = man["pickup-blade"] || {
      cols: 10,
      rows: 1,
      cell: 256,
      anims: { spin: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    };
    const frames = sheet
      ? sliceSheet(sheet, meta.cols, meta.rows || 1, 28, 28, meta.cell, "center")
      : [];
    Art.bladeAnims = mapAnims(frames, meta.anims);
    Art.gunIcon = frames[0] || null;
    Art.animHolds.blade = meta.holdMs || { spin: defaultHolds.spin };
  }

  Art.refSunset = refSunset;
  Art.refNight = refNight;
  Art.refTrain = refTrain;
  Art.neon = bakeNeonSet();

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
  Art.tileMetal = scaleTo(punchBlack(tileMetal, 12), TILE_TARGET, TILE_TARGET);
  Art.tileset = tileset;

  Art.uiFrame = punchBlack(uiFrame, 8);
  Art.uiPanel = uiPanel ? punchBlack(uiPanel, 8) : null;

  Art.props = propImgs
    .filter(Boolean)
    .map((img) => prepSprite(img, PROP_TARGET, PROP_TARGET))
    .filter(Boolean);

  Art.ready = true;
  return Art;
}
