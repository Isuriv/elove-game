/* Load MyPixels + PixelWhale + Grok Imagine sprites */
const BASE = "assets/game";
const PW = "assets/pixelwhale/ready";
const IMAGINE = "assets/imagine";

/** Sprite footprints for the 480×270 framebuffer (TILE = 16). */
export const PIXEL_W = 480;
export const PIXEL_H = 270;
export const PLAYER_TARGET_W = 40;
export const PLAYER_TARGET_H = 30;
export const DRONE_TARGET_W = 32;
export const DRONE_TARGET_H = 22;
export const SOLDIER_TARGET_W = 24;
export const SOLDIER_TARGET_H = 32;
export const PROP_TARGET = 24;
export const TILE_TARGET = 16;

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
 * Pack a set of trimmed canvases with one shared scale so subjects stay the same size.
 * Undersized frames (e.g. cyborg blast) get boosted toward the median body height.
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
  const baseScale = Math.min(boxW / maxW, boxH / maxH);

  return trimmedFrames.map((trimmed) => {
    // Shared scale keeps locked-camera subjects consistent; boost undersized poses (cyborg blast).
    let scale = baseScale;
    if (trimmed.height < targetH * 0.95) {
      const boosted = baseScale * (targetH / Math.max(1, trimmed.height));
      scale = Math.min(boosted, boxW / trimmed.width, boxH / trimmed.height);
    }
    const w = Math.max(1, Math.round(trimmed.width * scale));
    const h = Math.max(1, Math.round(trimmed.height * scale));
    const c = document.createElement("canvas");
    c.width = boxW;
    c.height = boxH;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, boxW, boxH);
    ctx.drawImage(trimmed, ((boxW - w) / 2) | 0, ((boxH - h) / 2) | 0, w, h);
    return c;
  });
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

/** Load sequential Grok-video capture frames: frames/video/<id>/<anim>-00.png … */
async function loadVideoAnimDir(id, animNames, maxW, maxH) {
  const byAnim = {};
  const allTrimmed = [];
  const indexMap = []; // { name, localIdx }

  for (const name of animNames) {
    byAnim[name] = [];
    for (let i = 0; i < 32; i++) {
      const src = `${IMAGINE}/frames/video/${id}/${name}-${String(i).padStart(2, "0")}.png`;
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

  const packed = packFramesUniform(allTrimmed, maxW, maxH);
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

/** @deprecated use frameAt from anim.js — kept for call sites */
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
  bladeAnims: null,
  playerHolds: null,
  droneHolds: null,
  cyborgHolds: null,
  bladeHolds: null,
  animDefaults: null,
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
  cables: null,
  powerups: null,
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
  const { DEFAULT_HOLDS } = await import("./anim.js");
  Art.animDefaults = { ...DEFAULT_HOLDS, ...(sheetManifest?.defaults || {}) };

  // Prefer sequential Grok-video frame captures (smooth temporal order).
  // Sheets are fallback only — never MyPixels / old stills for characters.
  const playerVideo = await loadVideoAnimDir(
    "player-cat-rocket",
    ["idle", "fly", "slash", "hurt"],
    PLAYER_TARGET_W,
    PLAYER_TARGET_H
  );
  const playerMeta = man["player-cat-rocket"];
  Art.playerAnims =
    (Object.keys(playerVideo).length ? playerVideo : null) ||
    loadCharacterFromSheet(sheetPlayer, playerMeta, PLAYER_TARGET_W, PLAYER_TARGET_H);
  Art.playerHolds = playerMeta?.holdMs || { idle: 450, fly: 180, slash: [160, 110, 70, 150], hurt: 140 };
  Art.catRocket = Art.playerAnims?.idle?.[0] || Art.playerAnims?.fly?.[0] || null;

  const droneVideo = await loadVideoAnimDir(
    "enemy-drone",
    ["fly", "attack", "hurt"],
    DRONE_TARGET_W,
    DRONE_TARGET_H
  );
  const droneMeta = man["enemy-drone"];
  Art.droneAnims =
    (Object.keys(droneVideo).length ? droneVideo : null) ||
    loadCharacterFromSheet(sheetDrone, droneMeta, DRONE_TARGET_W, DRONE_TARGET_H);
  Art.droneHolds = droneMeta?.holdMs || { fly: 180, attack: [150, 90, 55, 140], hurt: 120 };
  Art.drone = Art.droneAnims?.fly?.[0] || null;

  const cyborgVideo = await loadVideoAnimDir(
    "enemy-cyborg",
    ["idle", "walk", "attack", "hurt"],
    SOLDIER_TARGET_W,
    SOLDIER_TARGET_H
  );
  const cyborgMeta = man["enemy-cyborg"];
  Art.cyborgAnims =
    (Object.keys(cyborgVideo).length ? cyborgVideo : null) ||
    loadCharacterFromSheet(sheetCyborg, cyborgMeta, SOLDIER_TARGET_W, SOLDIER_TARGET_H);
  Art.cyborgHolds = cyborgMeta?.holdMs || { idle: 450, walk: 140, attack: [160, 100, 55, 150], hurt: 120 };
  Art.soldierStand = Art.cyborgAnims?.idle?.[0] || null;
  Art.soldierWalk = Art.cyborgAnims?.walk || [];
  Art.soldierShoot = Art.cyborgAnims?.attack?.[0] || null;

  const bladeVideo = await loadVideoAnimDir("pickup-blade", ["spin"], 16, 16);
  const bladeMeta = man["pickup-blade"];
  Art.bladeAnims =
    (Object.keys(bladeVideo).length ? bladeVideo : null) ||
    loadCharacterFromSheet(sheetBlade, bladeMeta, 16, 16);
  Art.bladeHolds = bladeMeta?.holdMs || { spin: 130 };
  Art.gunIcon = Art.bladeAnims?.spin?.[0] || null;

  if (!Art.playerAnims) console.warn("Missing Grok video player sprites");
  if (!Art.droneAnims) console.warn("Missing Grok video drone sprites");
  if (!Art.cyborgAnims) console.warn("Missing Grok video cyborg sprites");

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

  Art.cables = Art.neon.cables || [];
  Art.powerups = { ...(Art.neon.powerups || {}) };

  // Prefer Grok Imagine faux-3D pickups when present
  for (const key of ["shield", "battery", "heart", "magnet", "cable"]) {
    const img = await loadOptional(`${IMAGINE}/powerups/${key}.png`);
    if (img) {
      const fixed = prepSpriteFixed(img, key === "cable" ? 12 : 16, key === "cable" ? 28 : 16, true);
      if (key === "cable") {
        Art.cables = [fixed, ...(Art.cables || [])];
      } else {
        Art.powerups[key] = fixed;
      }
    }
  }

  Art.props = propImgs
    .filter(Boolean)
    .map((img) => prepSprite(img, PROP_TARGET, PROP_TARGET))
    .filter(Boolean);

  Art.ready = true;
  return Art;
}
