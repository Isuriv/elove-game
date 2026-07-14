/* Side-scroller platform map + collision */
import { CFG, TILE } from "./config.js";

export const World = (() => {
  const W = 96;
  const H = 14;

  function makeMap() {
    const m = [];
    for (let y = 0; y < H; y++) {
      const row = [];
      for (let x = 0; x < W; x++) {
        let t = TILE.EMPTY;
        if (y >= H - 2) t = TILE.SOLID;
        if (x === 0 || x === W - 1) t = TILE.SOLID;
        if (y === 0) t = TILE.SOLID;
        row.push(t);
      }
      m.push(row);
    }

    const plats = [
      [6, 10, 5],
      [14, 8, 4],
      [22, 9, 6],
      [30, 7, 4],
      [38, 9, 5],
      [46, 6, 4],
      [54, 8, 6],
      [64, 7, 5],
      [72, 9, 4],
      [80, 8, 5],
    ];
    for (const [px, py, len] of plats) {
      for (let i = 0; i < len; i++) {
        if (px + i > 0 && px + i < W - 1 && py > 0 && py < H - 2) {
          m[py][px + i] = TILE.PLATFORM;
        }
      }
    }

    for (const gap of [
      [28, 30],
      [50, 52],
      [70, 72],
    ]) {
      for (let x = gap[0]; x <= gap[1]; x++) {
        m[H - 2][x] = TILE.EMPTY;
        m[H - 1][x] = TILE.EMPTY;
      }
    }

    m[H - 3][W - 5] = TILE.EXIT;
    m[H - 3][W - 4] = TILE.EXIT;

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
    if (!inBounds(tx, ty)) return TILE.SOLID;
    return map[ty][tx];
  }

  function rectHitsSolid(left, top, right, bottom, vy = 0) {
    const x0 = Math.floor(left / CFG.TILE);
    const x1 = Math.floor(right / CFG.TILE);
    const y0 = Math.floor(top / CFG.TILE);
    const y1 = Math.floor(bottom / CFG.TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = get(tx, ty);
        if (t === TILE.SOLID) return true;
        if (t === TILE.PLATFORM && vy >= 0) {
          const tileTop = ty * CFG.TILE;
          // Only when crossing onto the platform from above
          if (bottom >= tileTop && bottom <= tileTop + 5 && top < tileTop) return true;
        }
      }
    }
    return false;
  }

  function tryMove(px, py, dx, dy, hw = 6, hh = 8) {
    let x = px;
    let y = py;

    // Horizontal
    if (dx !== 0) {
      const nx = x + dx;
      if (
        !rectHitsSolid(nx - hw, y - hh, nx + hw, y + hh, 0)
      ) {
        x = nx;
      }
    }

    // Vertical
    if (dy !== 0) {
      const ny = y + dy;
      if (!rectHitsSolid(x - hw, ny - hh, x + hw, ny + hh, dy)) {
        y = ny;
      } else if (dy > 0) {
        // Snap to floor / platform top
        const feet = y + hh;
        const ty = Math.floor((feet + dy) / CFG.TILE);
        y = ty * CFG.TILE - hh - 0.05;
      } else {
        // Hit ceiling
        const head = y - hh + dy;
        const ty = Math.floor(head / CFG.TILE);
        y = (ty + 1) * CFG.TILE + hh + 0.05;
      }
    }

    return { x, y };
  }

  function onGround(px, py, hw = 6, hh = 8) {
    return rectHitsSolid(px - hw, py - hh + 1, px + hw, py + hh + 1.5, 1);
  }

  function worldToTile(x, y) {
    return { tx: Math.floor(x / CFG.TILE), ty: Math.floor(y / CFG.TILE) };
  }

  function spawnPoint() {
    return { x: 3 * CFG.TILE + 8, y: (H - 4) * CFG.TILE };
  }

  function exitRect() {
    return {
      x: (W - 5) * CFG.TILE,
      y: (H - 4) * CFG.TILE,
      w: 2 * CFG.TILE,
      h: CFG.TILE,
    };
  }

  return {
    W,
    H,
    reset,
    get,
    tryMove,
    onGround,
    worldToTile,
    spawnPoint,
    exitRect,
    pixelW: () => W * CFG.TILE,
    pixelH: () => H * CFG.TILE,
  };
})();
