/* Lab tilemap + collision helpers */
import { CFG, TILE } from "./config.js";

export const World = (() => {
  const W = 40;
  const H = 28;

  function makeMap() {
    const m = [];
    for (let y = 0; y < H; y++) {
      const row = [];
      for (let x = 0; x < W; x++) {
        let t = TILE.FLOOR;
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) t = TILE.WALL;
        if (x === 12 && y > 0 && y < 14) t = TILE.WALL;
        if (y === 14 && x > 0 && x < 28) t = TILE.WALL;
        if (x === 28 && y > 0 && y < H - 1) t = TILE.WALL;
        if (y === 8 && x >= 12 && x < 28) t = TILE.WALL;

        if (x === 12 && (y === 6 || y === 7)) t = TILE.FLOOR;
        if (y === 8 && (x === 18 || x === 19)) t = TILE.FLOOR;
        if (y === 14 && (x === 16 || x === 17)) t = TILE.FLOOR;
        if (x === 28 && (y === 18 || y === 19)) t = TILE.FLOOR;

        if ((x === 20 && y === 11) || (x === 24 && y === 5)) t = TILE.DECOR;
        if (x === 6 && y === 5) t = TILE.POD;
        if (x === 15 && y === 11) t = TILE.CLOSET;
        if (x === 19 && y === 4) t = TILE.CONSOLE;
        if (x === 21 && y === 5) t = TILE.HIDDEN_BTN;
        if (x === 33 && (y === 18 || y === 19)) t = TILE.DOOR_LOCKED;
        if (x >= 35 && x <= 37 && y >= 17 && y <= 20) t = TILE.EXIT;

        // Cute furniture — corners / walls, keep puzzle paths clear
        // Pod room (spawn ~6,7 → door 12,6-7)
        if (x === 2 && y === 2) t = TILE.PLANT;
        if (x === 10 && y === 2) t = TILE.LAMP;
        if (x === 2 && y === 11) t = TILE.BEANBAG;
        if (x === 9 && y === 11) t = TILE.PLUSH;
        if (x === 4 && y === 3) t = TILE.RUG;
        // Upper lab (console/btn; gap 18-19,8)
        if (x === 14 && y === 2) t = TILE.SHELF;
        if (x === 26 && y === 2) t = TILE.PLANT;
        if (x === 14 && y === 6) t = TILE.CHAIR;
        if (x === 25 && y === 6) t = TILE.TABLE;
        // Mid lab (closet 15,11; gap 16-17,14)
        if (x === 26 && y === 10) t = TILE.FRIDGE;
        if (x === 22 && y === 9) t = TILE.PLANT;
        // Lower hall (gap 16-17,14 → door 28,18-19)
        if (x === 3 && y === 16) t = TILE.LAMP;
        if (x === 8 && y === 22) t = TILE.BEANBAG;
        if (x === 12 && y === 17) t = TILE.RUG;
        if (x === 20 && y === 20) t = TILE.CHAIR;
        if (x === 24 && y === 24) t = TILE.PLANT;
        if (x === 5 && y === 24) t = TILE.PLUSH;
        if (x === 22 && y === 16) t = TILE.TABLE;
        // East wing (door 33,18-19 / exit 35-37,17-20)
        if (x === 30 && y === 4) t = TILE.SHELF;
        if (x === 36 && y === 6) t = TILE.PLANT;
        if (x === 31 && y === 12) t = TILE.LAMP;
        if (x === 36 && y === 23) t = TILE.BEANBAG;
        if (x === 30 && y === 23) t = TILE.CHAIR;

        row.push(t);
      }
      m.push(row);
    }
    return m;
  }

  let map = makeMap();

  function reset() {
    map = makeMap();
  }

  function inBounds(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < W && ty < H;
  }

  function get(tx, ty) {
    if (!inBounds(tx, ty)) return TILE.WALL;
    return map[ty][tx];
  }

  function set(tx, ty, v) {
    if (inBounds(tx, ty)) map[ty][tx] = v;
  }

  function solid(tx, ty) {
    const t = get(tx, ty);
    return (
      t === TILE.WALL ||
      t === TILE.DOOR_LOCKED ||
      t === TILE.DECOR ||
      t === TILE.CONSOLE ||
      t === TILE.CLOSET ||
      t === TILE.POD ||
      t === TILE.BEANBAG ||
      t === TILE.CHAIR ||
      t === TILE.PLANT ||
      t === TILE.FRIDGE ||
      t === TILE.LAMP ||
      t === TILE.PLUSH ||
      t === TILE.TABLE ||
      t === TILE.SHELF
      // RUG is walkable
    );
  }

  function collides(px, py, hw = 5, hh = 6) {
    const points = [
      [px - hw, py - hh],
      [px + hw, py - hh],
      [px - hw, py + hh],
      [px + hw, py + hh],
    ];
    for (const [x, y] of points) {
      const tx = Math.floor(x / CFG.TILE);
      const ty = Math.floor(y / CFG.TILE);
      if (solid(tx, ty)) return true;
    }
    return false;
  }

  function tryMove(px, py, dx, dy, hw = 5, hh = 6) {
    let nx = px + dx;
    let ny = py + dy;
    if (!collides(nx, py, hw, hh)) px = nx;
    if (!collides(px, ny, hw, hh)) py = ny;
    return { x: px, y: py };
  }

  function unlockDoor() {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (map[y][x] === TILE.DOOR_LOCKED) map[y][x] = TILE.DOOR_OPEN;
      }
    }
  }

  function worldToTile(x, y) {
    return { tx: Math.floor(x / CFG.TILE), ty: Math.floor(y / CFG.TILE) };
  }

  function forEachTile(fn) {
    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        fn(tx, ty, map[ty][tx]);
      }
    }
  }

  return {
    W,
    H,
    reset,
    get,
    set,
    solid,
    collides,
    tryMove,
    unlockDoor,
    worldToTile,
    forEachTile,
    pixelW: () => W * CFG.TILE,
    pixelH: () => H * CFG.TILE,
  };
})();
