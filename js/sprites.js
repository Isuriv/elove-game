/* Procedural HD-pixel sprites — nearest-neighbor friendly */
import { CFG } from "./config.js";

const C = CFG.COLORS;

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Build an offscreen canvas from a 2D palette grid (rows of hex/'0' transparent). */
export function bakeGrid(rows, px = 1) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const canvas = document.createElement("canvas");
  canvas.width = w * px;
  canvas.height = h * px;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (!ch || ch === "0" || ch === ".") continue;
      const color = typeof ch === "string" && ch.startsWith("#") ? ch : PALETTE[ch] || ch;
      if (!color || color === "0") continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * px, y * px, px, px);
    }
  }
  return canvas;
}

const PALETTE = {
  P: C.pink,
  C: C.cyan,
  U: C.purple,
  G: C.gold,
  W: C.cream,
  K: C.ink,
  F: C.floor,
  A: C.floorAlt,
  L: C.wall,
  D: C.wallDark,
  O: C.pod,
  R: C.danger,
  N: C.ok,
  S: "#f2c4b0", // light skin
  H: "#2a1838", // near-black purple hair
  I: "#6a4a88", // lavender hair highlight
  J: "#c878b0", // pink hair tip
  M: "#c0c8d8", // metal
  B: "#ff5aad", // bright pink boot/glove
  E: "#5ce8c8", // mint/teal eye
  X: "#ffe8a0", // highlight
  Y: "#ff9ad5", // pink light
  Z: "#8a6aaa", // mid wall
  T: "#5a4070", // tile groove
  V: "#6ec4e0", // pod glass
  Q: "#d4b8e8", // floor light
  a: "#e8eef4", // white jacket
  b: "#9aabbc", // blue-grey pants
  c: "#6b4a2e", // brown belt
  d: "#5a3078", // purple thigh strap
  e: "#ff7eb9", // hot pink ear / accent
  f: "#ffe0f0", // jacket highlight
};

function tileCanvas(drawFn, size = 16) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx, size);
  return c;
}

function fillPx(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Detailed floor / wall / prop tiles at 32×32 (HD pixel). */
export function makeTiles() {
  const S = 32; // 2× logical tile for crisp HD pixels
  const tiles = {};

  tiles.floor = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floor);
    fillPx(ctx, 0, 0, S, 1, C.floorAlt);
    fillPx(ctx, 0, 0, 1, S, C.floorAlt);
    // subtle panel lines
    fillPx(ctx, 2, 2, S - 4, 1, "#dfc8ec");
    fillPx(ctx, 2, 2, 1, S - 4, "#dfc8ec");
    fillPx(ctx, S - 3, 3, 1, S - 6, "#cbb0dc");
    fillPx(ctx, 3, S - 3, S - 6, 1, "#cbb0dc");
    // tiny glitter
    fillPx(ctx, 10, 8, 2, 2, "#f2e0fa");
    fillPx(ctx, 22, 18, 2, 2, "#f2e0fa");
    fillPx(ctx, 14, 24, 1, 1, C.pink);
  }, S);

  tiles.floorAlt = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floorAlt);
    fillPx(ctx, 0, 0, S, 1, C.floor);
    fillPx(ctx, 0, 0, 1, S, C.floor);
    fillPx(ctx, 4, 6, 3, 2, "#d0b4e4");
    fillPx(ctx, 18, 14, 2, 2, "#e8d0f2");
    fillPx(ctx, 8, 22, 2, 1, C.cyan);
  }, S);

  tiles.wall = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.wall);
    fillPx(ctx, 0, 0, S, 4, C.wallDark);
    fillPx(ctx, 0, S - 4, S, 4, "#8a6aaa");
    // rivets
    for (let i = 0; i < 4; i++) {
      fillPx(ctx, 4 + i * 7, 8, 3, 3, C.wallDark);
      fillPx(ctx, 5 + i * 7, 9, 1, 1, C.gold);
      fillPx(ctx, 4 + i * 7, 20, 3, 3, C.wallDark);
      fillPx(ctx, 5 + i * 7, 21, 1, 1, C.cyan);
    }
    fillPx(ctx, 2, 14, S - 4, 2, "#7a5a98");
  }, S);

  tiles.pod = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floor);
    // cracked pod base
    fillPx(ctx, 4, 6, 24, 22, C.pod);
    fillPx(ctx, 6, 4, 20, 4, "#a8daf0");
    fillPx(ctx, 8, 8, 16, 14, "#b8e8f8");
    fillPx(ctx, 10, 10, 12, 10, "#d8f4ff");
    // crack
    fillPx(ctx, 14, 6, 2, 18, C.ink);
    fillPx(ctx, 12, 14, 6, 2, C.ink);
    fillPx(ctx, 16, 18, 4, 2, C.ink);
    // pink glow inside
    fillPx(ctx, 11, 12, 3, 3, C.pink);
    fillPx(ctx, 18, 15, 2, 2, "#ffb0d8");
    // rim gold
    fillPx(ctx, 4, 26, 24, 2, C.gold);
  }, S);

  tiles.closet = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floor);
    fillPx(ctx, 4, 2, 24, 28, C.wallDark);
    fillPx(ctx, 6, 4, 20, 24, "#5a4078");
    // doors
    fillPx(ctx, 7, 5, 8, 20, C.purple);
    fillPx(ctx, 17, 5, 8, 20, "#9a70d0");
    fillPx(ctx, 15, 5, 2, 20, C.ink);
    // gold handles
    fillPx(ctx, 13, 14, 2, 3, C.gold);
    fillPx(ctx, 17, 14, 2, 3, C.gold);
    // sword glow peek
    fillPx(ctx, 10, 8, 2, 10, C.gold);
    fillPx(ctx, 9, 7, 4, 2, "#ffe8a0");
  }, S);

  tiles.console = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floor);
    fillPx(ctx, 3, 8, 26, 20, C.ink);
    fillPx(ctx, 5, 4, 22, 8, C.wallDark);
    // screen
    fillPx(ctx, 7, 10, 18, 10, C.cyan);
    fillPx(ctx, 9, 12, 14, 6, "#2a4858");
    fillPx(ctx, 10, 13, 4, 2, C.pink);
    fillPx(ctx, 16, 14, 5, 2, C.gold);
    fillPx(ctx, 11, 16, 8, 1, C.purple);
    // keypad
    fillPx(ctx, 8, 22, 3, 3, C.purple);
    fillPx(ctx, 13, 22, 3, 3, C.pink);
    fillPx(ctx, 18, 22, 3, 3, C.gold);
  }, S);

  tiles.hiddenBtn = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floor);
    fillPx(ctx, 10, 10, 12, 12, "#c8a8d8");
    fillPx(ctx, 12, 12, 8, 8, C.pink);
    fillPx(ctx, 14, 14, 4, 4, "#ffb0d8");
    fillPx(ctx, 15, 15, 2, 2, C.cream);
  }, S);

  tiles.doorLocked = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.wallDark);
    fillPx(ctx, 2, 2, S - 4, S - 4, C.danger);
    fillPx(ctx, 6, 6, S - 12, S - 12, "#c04060");
    fillPx(ctx, 12, 10, 8, 12, C.ink);
    fillPx(ctx, 14, 14, 4, 4, C.gold);
    fillPx(ctx, 4, 4, 4, 4, C.cyan);
    fillPx(ctx, S - 8, 4, 4, 4, C.cyan);
  }, S);

  tiles.doorOpen = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floor);
    fillPx(ctx, 0, 0, 4, S, C.ok);
    fillPx(ctx, S - 4, 0, 4, S, C.ok);
    fillPx(ctx, 6, 4, 4, 4, "#a0ffd0");
    fillPx(ctx, 20, 20, 4, 4, "#a0ffd0");
    fillPx(ctx, 10, 14, 12, 2, C.cyan);
  }, S);

  tiles.exit = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, "#2a4038");
    fillPx(ctx, 2, 2, S - 4, S - 4, C.ok);
    fillPx(ctx, 6, 6, S - 12, S - 12, "#4a9068");
    fillPx(ctx, 10, 10, 12, 12, "#7dffb3");
    fillPx(ctx, 13, 13, 6, 6, C.cream);
    // chevron
    fillPx(ctx, 14, 8, 4, 2, C.ink);
    fillPx(ctx, 12, 10, 8, 2, C.ink);
  }, S);

  tiles.decor = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floor);
    fillPx(ctx, 8, 10, 16, 18, C.wallDark);
    fillPx(ctx, 10, 6, 12, 8, C.purple);
    fillPx(ctx, 12, 8, 8, 4, C.cyan);
    fillPx(ctx, 14, 14, 4, 10, C.gold);
  }, S);

  // --- Cute furniture props (HD pixel, pink/cyan/purple/gold) ---
  tiles.beanbag = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floor);
    fillPx(ctx, 4, 14, 24, 14, "#e868a8");
    fillPx(ctx, 6, 10, 20, 8, C.pink);
    fillPx(ctx, 8, 8, 16, 6, "#ff9ad5");
    fillPx(ctx, 10, 12, 6, 4, "#ffe0f0");
    fillPx(ctx, 18, 16, 4, 3, C.purple);
    fillPx(ctx, 5, 26, 22, 2, "#c05080");
  }, S);

  tiles.chair = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floor);
    fillPx(ctx, 8, 4, 16, 10, C.cyan);
    fillPx(ctx, 10, 6, 12, 6, "#a8f0f4");
    fillPx(ctx, 6, 14, 20, 8, C.purple);
    fillPx(ctx, 8, 16, 16, 4, "#c8a0ff");
    fillPx(ctx, 8, 22, 3, 6, C.gold);
    fillPx(ctx, 21, 22, 3, 6, C.gold);
    fillPx(ctx, 14, 22, 4, 2, C.ink);
  }, S);

  tiles.plant = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floor);
    fillPx(ctx, 11, 18, 10, 10, C.gold);
    fillPx(ctx, 13, 20, 6, 6, "#e8b84a");
    fillPx(ctx, 14, 10, 4, 10, "#4a8860");
    fillPx(ctx, 8, 6, 6, 8, "#7dffb3");
    fillPx(ctx, 16, 4, 8, 8, C.pink);
    fillPx(ctx, 12, 2, 6, 6, "#a0ffd0");
    fillPx(ctx, 18, 10, 5, 5, "#ff9ad5");
    fillPx(ctx, 10, 12, 4, 4, C.cyan);
  }, S);

  tiles.fridge = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floor);
    fillPx(ctx, 6, 2, 20, 28, C.cream);
    fillPx(ctx, 8, 4, 16, 10, "#e8eef8");
    fillPx(ctx, 8, 16, 16, 12, "#dce4f0");
    fillPx(ctx, 7, 14, 18, 2, C.purple);
    fillPx(ctx, 20, 8, 2, 4, C.gold);
    fillPx(ctx, 20, 20, 2, 4, C.gold);
    fillPx(ctx, 10, 6, 4, 2, C.cyan);
    fillPx(ctx, 10, 18, 3, 3, C.pink);
    fillPx(ctx, 6, 28, 20, 2, C.ink);
  }, S);

  tiles.lamp = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floor);
    fillPx(ctx, 14, 16, 4, 12, C.ink);
    fillPx(ctx, 10, 26, 12, 4, C.purple);
    fillPx(ctx, 8, 4, 16, 10, C.gold);
    fillPx(ctx, 10, 6, 12, 6, "#ffe8a0");
    fillPx(ctx, 12, 8, 8, 3, C.cream);
    fillPx(ctx, 6, 12, 20, 2, "#c89840");
    // soft glow dots
    fillPx(ctx, 4, 10, 2, 2, "#fff0c0");
    fillPx(ctx, 26, 10, 2, 2, "#fff0c0");
  }, S);

  tiles.plush = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floor);
    // cute cat plush
    fillPx(ctx, 8, 10, 16, 14, C.pink);
    fillPx(ctx, 10, 8, 12, 6, "#ff9ad5");
    fillPx(ctx, 8, 6, 4, 6, C.pink); // ear
    fillPx(ctx, 20, 6, 4, 6, C.pink);
    fillPx(ctx, 10, 8, 2, 3, "#ffe0f0");
    fillPx(ctx, 20, 8, 2, 3, "#ffe0f0");
    fillPx(ctx, 12, 14, 3, 3, C.ink); // eyes
    fillPx(ctx, 18, 14, 3, 3, C.ink);
    fillPx(ctx, 13, 15, 1, 1, C.cyan);
    fillPx(ctx, 19, 15, 1, 1, C.cyan);
    fillPx(ctx, 15, 18, 3, 2, "#e868a8");
    fillPx(ctx, 10, 24, 12, 4, C.purple); // cushion
  }, S);

  tiles.table = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floor);
    fillPx(ctx, 4, 10, 24, 10, C.purple);
    fillPx(ctx, 6, 12, 20, 6, "#c8a0ff");
    fillPx(ctx, 8, 14, 6, 3, C.gold); // mug
    fillPx(ctx, 18, 13, 5, 4, C.cyan); // book
    fillPx(ctx, 6, 20, 3, 8, C.ink);
    fillPx(ctx, 23, 20, 3, 8, C.ink);
    fillPx(ctx, 4, 18, 24, 2, "#8a60c0");
  }, S);

  tiles.rug = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floor);
    fillPx(ctx, 2, 6, 28, 20, C.pink);
    fillPx(ctx, 4, 8, 24, 16, "#ff9ad5");
    fillPx(ctx, 8, 10, 16, 12, C.purple);
    fillPx(ctx, 12, 13, 8, 6, C.gold);
    fillPx(ctx, 14, 15, 4, 2, C.cream);
    fillPx(ctx, 2, 6, 28, 2, "#e868a8");
    fillPx(ctx, 2, 24, 28, 2, "#e868a8");
  }, S);

  tiles.shelf = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, C.floor);
    fillPx(ctx, 2, 4, 28, 24, C.wallDark);
    fillPx(ctx, 4, 6, 24, 6, "#5a4078");
    fillPx(ctx, 4, 14, 24, 6, "#5a4078");
    fillPx(ctx, 4, 22, 24, 4, "#5a4078");
    fillPx(ctx, 6, 8, 4, 3, C.pink);
    fillPx(ctx, 12, 7, 5, 4, C.cyan);
    fillPx(ctx, 20, 8, 4, 3, C.gold);
    fillPx(ctx, 8, 16, 6, 3, C.purple);
    fillPx(ctx, 18, 15, 6, 4, C.cream);
    fillPx(ctx, 10, 24, 4, 2, C.pink);
    fillPx(ctx, 18, 24, 5, 2, C.cyan);
  }, S);

  tiles.empty = tileCanvas((ctx) => {
    fillPx(ctx, 0, 0, S, S, "#120818");
  }, S);

  return tiles;
}

/** Cat-girl Meow Hybrid — reference-matched HD pixel (¾ top-down). */
export function makePlayerFrames() {
  const frames = { idle: [], walk: [], slash: [], hurt: [], success: [] };
  const px = 2;
  // Palette keys: H dark hair, I lavender, J pink tip, e pink ear,
  // S skin, E mint eye, a white jacket, f jacket hi, B pink glove/boot,
  // b blue-grey pants, c brown belt, d purple strap, G gold accent
  frames.idle.push(
    bakeGrid(
      [
        "............e...e.............",
        "...........eHe.eHe............",
        "..........HHHHHHHHH...........",
        ".........HHISSSSSIHH..........",
        ".........HISEESSESIH..........",
        ".........HHISSSSSIHH..........",
        "..........HHIIIIHHH...........",
        ".........HHHaaaaaHHHH.........",
        "........HHaafffffaaHJJ........",
        ".......IHHaGaaaaGaHHJJI.......",
        "......HIIHHaaaaaaaHHJJII......",
        ".....HIII..SSSSSS..HJJIII.....",
        "....HIIII..cbbbbbc.HJJIIII....",
        "...HIIIII..bbdbbbb.HJJIIIII...",
        "..HIIIIII..bbbbbb..HJJIIIIII..",
        ".HIIIIIII..BB..BB..HJJIIIIIII.",
        "HIIIIIIII.BBB..BBB.JJIIIIIIII.",
        ".IIIIIII...............IIIII..",
      ],
      px
    )
  );

  frames.idle.push(
    bakeGrid(
      [
        "............e...e.............",
        "...........eHe.eHe............",
        "..........HHHHHHHHH...........",
        ".........HHISSSSSIHH..........",
        ".........HISEESSESIH..........",
        ".........HHISSSSSIHH..........",
        "..........HHIIIIHHH...........",
        ".........HHHaaaaaHHHH.........",
        "........HHaafffffaaHJJ........",
        ".......IHHaGaaaaGaHHJJI.......",
        "......HIIHHaaaaaaaHHJJII......",
        ".....HIII..SSSSSS..HJJIII.....",
        "....HIIII..cbbbbbc.HJJIIII....",
        "...HIIIII..bbdbbbb.HJJIIIII...",
        "..HIIIIII..bbbbbb..HJJIIIIII..",
        ".HIIIIIII...BB.BB..HJJIIIIIII.",
        "HIIIIIIII..BBB.BBB.JJIIIIIIII.",
        "..IIIIII...............IIII...",
      ],
      px
    )
  );

  frames.walk.push(
    bakeGrid(
      [
        "............e...e.............",
        "...........eHe.eHe............",
        "..........HHHHHHHHH...........",
        ".........HHISSSSSIHH..........",
        ".........HISEESSESIH..........",
        ".........HHISSSSSIHH..........",
        "..........HHIIIIHHH...........",
        ".........HHHaaaaaHHHH.........",
        "........HBaafffffaaBHJJ.......",
        ".......IHBaGaaaaGaBBHJJI......",
        "......HIIHHaaaaaaaHHJJII......",
        ".....HIII..SSSSSS..HJJIII.....",
        "....HIIII..cbbbbbc.HJJIIII....",
        "...HIIIII..bbdbbbb.HJJIIIII...",
        "..HIIIIII.BB....BB.HJJIIIIII..",
        ".HIIIIIII.BBB...BB.HJJIIIIIII.",
        "HIIIIIIII..........JJIIIIIIII.",
        ".IIIIIII...............IIIII..",
      ],
      px
    )
  );

  frames.walk.push(
    bakeGrid(
      [
        "............e...e.............",
        "...........eHe.eHe............",
        "..........HHHHHHHHH...........",
        ".........HHISSSSSIHH..........",
        ".........HISEESSESIH..........",
        ".........HHISSSSSIHH..........",
        "..........HHIIIIHHH...........",
        ".........HHHaaaaaHHHH.........",
        "........HBaafffffaaBHJJ.......",
        ".......IHBaGaaaaGaBBHJJI......",
        "......HIIHHaaaaaaaHHJJII......",
        ".....HIII..SSSSSS..HJJIII.....",
        "....HIIII..cbbbbbc.HJJIIII....",
        "...HIIIII..bbdbbbb.HJJIIIII...",
        "..HIIIIII.BB....BB.HJJIIIIII..",
        ".HIIIIIII.BB...BBB.HJJIIIIIII.",
        "HIIIIIIII..........JJIIIIIIII.",
        ".IIIIIII...............IIIII..",
      ],
      px
    )
  );

  frames.slash.push(
    bakeGrid(
      [
        "............e...e.............",
        "...........eHe.eHe............",
        "..........HHHHHHHHH...........",
        ".........HHISSSSSIHH..........",
        ".........HISEESSESIH....GGX...",
        ".........HHISSSSSIHH...GGGX...",
        "..........HHIIIIHHH...GGG.....",
        ".........HHHaaaaaHH.GGG.......",
        "........HBaafffffGGHHJJ.......",
        ".......IHBaGaaaaGaBBHJJI......",
        "......HIIHHaaaaaaaHHJJII......",
        ".....HIII..SSSSSS..HJJIII.....",
        "....HIIII..cbbbbbc.HJJIIII....",
        "...HIIIII..bbdbbbb.HJJIIIII...",
        "..HIIIIII..BB..BB..HJJIIIIII..",
        ".HIIIIIII.BBB..BBB.HJJIIIIIII.",
        "HIIIIIIII..........JJIIIIIIII.",
        ".IIIIIII...............IIIII..",
      ],
      px
    )
  );

  frames.hurt.push(
    bakeGrid(
      [
        "............e...e.............",
        "...........eHe.eHe............",
        "..........HHHHHHHHH...........",
        ".........HHISSSSSIHH..........",
        ".........HISRRSSRSIH..........",
        ".........HHISSSSSIHH..........",
        "..........HHIIIIHHH...........",
        ".........HHHaaaaaHHHH.........",
        "........HHaafffffaaHJJ........",
        ".......IHHaRaaaaRaHHJJI.......",
        "......HIIHHaaaaaaaHHJJII......",
        ".....HIII..SSSSSS..HJJIII.....",
        "....HIIII..cbbbbbc.HJJIIII....",
        "...HIIIII..bbdbbbb.HJJIIIII...",
        "..HIIIIII..bbbbbb..HJJIIIIII..",
        ".HIIIIIII..BB..BB..HJJIIIIIII.",
        "HIIIIIIII.BBB..BBB.JJIIIIIIII.",
        ".IIIIIII...............IIIII..",
      ],
      px
    )
  );

  frames.success.push(
    bakeGrid(
      [
        "............e...e.............",
        "...........eHe.eHe............",
        "..........HHHHHHHHH...........",
        ".........HHISSSSSIHH..........",
        ".........HISEESSESIH..........",
        ".........HHISSSSSIHH..........",
        "..........HHIIIIHHH...........",
        ".........HHHaaaaaHHHH.........",
        "......B.HHaafffffaaHJJ.B......",
        ".......IHHaGaaaaGaHHJJI.......",
        "......HIIHHaaGGaaaHHJJII......",
        ".....HIII..SSSSSS..HJJIII.....",
        "....HIIII..cbbbbbc.HJJIIII....",
        "...HIIIII..bbdbbbb.HJJIIIII...",
        "..HIIIIII..bbbbbb..HJJIIIIII..",
        ".HIIIIIII..BB..BB..HJJIIIIIII.",
        "HIIIIIIII.BBB..BBB.JJIIIIIIII.",
        ".IIIIIII...............IIIII..",
      ],
      px
    )
  );

  return frames;
}

/** Cyborg enemy frames. */
export function makeCyborgFrames() {
  const px = 2;
  const frames = { walk: [], attack: [], headless: [], idle: [] };

  frames.walk.push(
    bakeGrid(
      [
        "......................",
        ".......MMMMMM.........",
        "......MCCCCCCM........",
        "......MCEEECMM........",
        "......MCCCCCCM........",
        ".......MMMMMM.........",
        "......UUMMMMUU........",
        ".....UUMMMMMMUU.......",
        ".....UUMMKKMMUU.......",
        "......UUMMMMUU........",
        ".......MM..MM.........",
        "......MMM..MMM........",
        "......KKK..KKK........",
        "......................",
      ],
      px
    )
  );

  frames.walk.push(
    bakeGrid(
      [
        "......................",
        ".......MMMMMM.........",
        "......MCCCCCCM........",
        "......MCEEECMM........",
        "......MCCCCCCM........",
        ".......MMMMMM.........",
        "......UUMMMMUU........",
        ".....UUMMMMMMUU.......",
        ".....UUMMKKMMUU.......",
        "......UUMMMMUU........",
        "......MM....MM........",
        ".....MMM....MMM.......",
        ".....KKK....KK........",
        "......................",
      ],
      px
    )
  );

  frames.attack.push(
    bakeGrid(
      [
        "......................",
        ".......MMMMMM.........",
        "......MCRRRRCM........",
        "......MCEEECMM........",
        "......MCCCCCCM........",
        ".......MMMMMM.........",
        "......UUMMMMUU...RR...",
        ".....UUMMMMMMUURRR....",
        ".....UUMMKKMMUUR......",
        "......UUMMMMUU........",
        ".......MM..MM.........",
        "......MMM..MMM........",
        "......KKK..KKK........",
        "......................",
      ],
      px
    )
  );

  frames.headless.push(
    bakeGrid(
      [
        "......................",
        "......................",
        ".......RR..RR.........",
        "........RRRR..........",
        ".......MMMMMM.........",
        "......UUMMMMUU........",
        ".....UUMMMMMMUU.......",
        ".....UUMMKKMMUU.......",
        "......UUMMMMUU........",
        ".......MM..MM.........",
        "......MMM..MMM........",
        "......KKK..KKK........",
        "......................",
        "......................",
      ],
      px
    )
  );

  frames.idle = [frames.walk[0]];

  return frames;
}

export function makeLootSprites() {
  return {
    sword: bakeGrid(
      [
        "........GX..........",
        ".......GGG..........",
        "......GGG...........",
        ".....GGG............",
        "....GGG.............",
        "...GGG..............",
        "..GGG.UU............",
        ".GGG.UUU............",
        "GGG..UU.............",
        "KK..................",
        "KK..................",
      ],
      2
    ),
    eye: bakeGrid(
      [
        "......CCCC......",
        "....CCCCCCCC....",
        "...CCEEEEEECC...",
        "..CCEEKKKEECC...",
        "..CEEKWWWKEEC...",
        "..CEEKWWWKEEC...",
        "..CCEEKKKEECC...",
        "...CCEEEEEECC...",
        "....CCCCCCCC....",
        "......CCCC......",
      ],
      2
    ),
  };
}

export function makeMarkerGlow() {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(16, 16, 2, 16, 16, 15);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return c;
}

export function makeSlashArc() {
  return bakeGrid(
    [
      "..........XXXX......",
      "........XXGGGX......",
      "......XXGGG.........",
      "....XXGGG...........",
      "..XXGGG.............",
      ".XGGG...............",
      "XGG.................",
      "XG..................",
    ],
    2
  );
}
