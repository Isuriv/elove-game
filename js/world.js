/* Side-scroller platform map + collision */
import { CFG, TILE, isPlatformTile } from "./config.js?v=deploy-assets-20261111";

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

    // [tx, ty, length, tileType] - mixed mechanics across the run
    // Gaps 2-4 tiles / 32-64px; ups <= +3 tiles for JUMP_VY ~ -6.0
    const plats = [
      [6, 10, 5, TILE.PLATFORM],
      [14, 8, 4, TILE.PLAT_SLIP],
      [22, 9, 6, TILE.PLATFORM],
      [30, 7, 4, TILE.PLAT_BOUNCE],
      [38, 9, 5, TILE.PLAT_SLIP],
      [46, 6, 4, TILE.PLATFORM],
      [54, 8, 6, TILE.PLAT_BOUNCE],
      [64, 7, 5, TILE.PLAT_SLIP],
      [72, 9, 4, TILE.PLATFORM],
      [80, 8, 5, TILE.PLAT_BOUNCE],
    ];
    for (const [px, py, len, kind] of plats) {
      for (let i = 0; i < len; i++) {
        if (px + i > 0 && px + i < W - 1 && py > 0 && py < H - 2) {
          m[py][px + i] = kind;
        }
      }
    }

    for (const gap of [
      [28, 30],
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

  /**
   * Mario one-way pads: solid only while falling through the lip from above.
   * Swept test (prevBottom -> bottom) covers fast falls up to MAX_FALL without a
   * separate "in band" catch, which falsely grounded players rising through from below.
   */
  function platformLipHit(tileTop, bottom, prevBottom) {
    return (
      prevBottom != null &&
      prevBottom <= tileTop + 0.01 &&
      bottom >= tileTop
    );
  }

  function rectHitsSolid(left, top, right, bottom, vy = 0, prevBottom = null) {
    const x0 = Math.floor(left / CFG.TILE);
    const x1 = Math.floor(right / CFG.TILE);
    // Include platform rows the feet swept through this step (thin pad tunneling).
    const y0 = Math.floor(top / CFG.TILE);
    const y1 = Math.floor(bottom / CFG.TILE);
    const sweepY0 =
      prevBottom != null && vy > 0
        ? Math.min(y0, Math.floor(prevBottom / CFG.TILE))
        : y0;
    for (let ty = sweepY0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = get(tx, ty);
        if (t === TILE.SOLID) return true;
        if (isPlatformTile(t) && vy > 0 && platformLipHit(ty * CFG.TILE, bottom, prevBottom)) {
          return true;
        }
      }
    }
    return false;
  }

  function tryMove(px, py, dx, dy, hw = 6, hh = 8) {
    let x = px;
    let y = py;

    // Horizontal - one-way pads are never walls (vy=0 ignores platforms)
    if (dx !== 0) {
      const nx = x + dx;
      if (!rectHitsSolid(nx - hw, y - hh, nx + hw, y + hh, 0)) {
        x = nx;
      }
    }

    // Vertical
    if (dy !== 0) {
      const ny = y + dy;
      const prevBottom = y + hh;
      if (!rectHitsSolid(x - hw, ny - hh, x + hw, ny + hh, dy, prevBottom)) {
        y = ny;
      } else if (dy > 0) {
        // Snap to highest platform lip crossed this step, else solid floor
        let snapY = null;
        const x0 = Math.floor((x - hw) / CFG.TILE);
        const x1 = Math.floor((x + hw) / CFG.TILE);
        const feetBottom = ny + hh;
        const sweepY0 = Math.floor(Math.min(prevBottom, feetBottom) / CFG.TILE);
        const sweepY1 = Math.floor(Math.max(prevBottom, feetBottom) / CFG.TILE);
        for (let ty = sweepY0; ty <= sweepY1; ty++) {
          for (let tx = x0; tx <= x1; tx++) {
            const t = get(tx, ty);
            if (!isPlatformTile(t)) continue;
            const tileTop = ty * CFG.TILE;
            if (platformLipHit(tileTop, feetBottom, prevBottom)) {
              const lip = tileTop - hh - 0.05;
              if (snapY == null || lip < snapY) snapY = lip;
            }
          }
        }
        if (snapY != null) {
          y = snapY;
        } else {
          const feet = y + hh;
          const ty = Math.floor((feet + dy) / CFG.TILE);
          y = ty * CFG.TILE - hh - 0.05;
        }
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
    // Pass current feet as prevBottom so one-way pads only count when standing on
    // (or micro-stepping onto) the lip - not while embedded rising from below.
    const feet = py + hh;
    return rectHitsSolid(px - hw, py - hh + 1, px + hw, py + hh + 1.5, 1, feet);
  }

  /** Tile type supporting the player's feet (platform or solid), else EMPTY. */
  function surfaceUnder(px, py, hw = 6, hh = 8) {
    const left = px - hw;
    const right = px + hw;
    const feet = py + hh;
    const bottom = feet + 1.5;
    const x0 = Math.floor(left / CFG.TILE);
    const x1 = Math.floor(right / CFG.TILE);
    const ty = Math.floor(bottom / CFG.TILE);
    let best = TILE.EMPTY;
    for (let tx = x0; tx <= x1; tx++) {
      const t = get(tx, ty);
      if (t === TILE.SOLID) return TILE.SOLID;
      if (isPlatformTile(t) && platformLipHit(ty * CFG.TILE, bottom, feet)) best = t;
    }
    return best;
  }

  function worldToTile(x, y) {
    return { tx: Math.floor(x / CFG.TILE), ty: Math.floor(y / CFG.TILE) };
  }

  function spawnPoint() {
    return { x: 3 * CFG.TILE + 8, y: (H - 4) * CFG.TILE };
  }

  function exitRect() {
    // Matches TILE.EXIT at (W-5, H-3) and (W-4, H-3) — the floor pad the player stands in.
    return {
      x: (W - 5) * CFG.TILE,
      y: (H - 3) * CFG.TILE,
      w: 2 * CFG.TILE,
      h: CFG.TILE,
    };
  }

  /**
   * Contiguous walkable pads from the current map (floating plats + solid floor).
   * Each pad: { x0, x1, ty, kind: "plat"|"floor" } in tile coords (inclusive x).
   * Skips side-wall columns; does not treat EXIT as a pad surface.
   */
  function walkPads() {
    const pads = [];
    const floorTy = H - 2;
    for (let ty = 1; ty < H - 1; ty++) {
      let runStart = null;
      let runKind = null;
      const flush = (endX) => {
        if (runStart == null) return;
        const x0 = Math.max(runStart, 1);
        const x1 = Math.min(endX, W - 2);
        if (x1 >= x0) pads.push({ x0, x1, ty, kind: runKind });
        runStart = null;
        runKind = null;
      };
      for (let tx = 0; tx < W; tx++) {
        const t = map[ty][tx];
        let kind = null;
        if (isPlatformTile(t)) kind = "plat";
        else if (t === TILE.SOLID && ty === floorTy) kind = "floor";
        if (kind) {
          if (runStart == null) {
            runStart = tx;
            runKind = kind;
          } else if (kind !== runKind) {
            flush(tx - 1);
            runStart = tx;
            runKind = kind;
          }
        } else {
          flush(tx - 1);
        }
      }
      flush(W - 1);
    }
    return pads;
  }

  return {
    W,
    H,
    reset,
    get,
    tryMove,
    onGround,
    surfaceUnder,
    worldToTile,
    spawnPoint,
    exitRect,
    walkPads,
    pixelW: () => W * CFG.TILE,
    pixelH: () => H * CFG.TILE,
  };
})();
