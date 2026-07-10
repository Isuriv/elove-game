/* ELOVE GAME — shared config & palette (3D) */
export const CFG = {
  TILE: 16, // logical units (collision / gameplay coords)
  UNIT: 1, // 1 tile = 1 world unit in Three.js
  PLAYER_SPEED: 1.35,
  SLASH_RANGE: 22,
  SLASH_COOLDOWN: 280,
  FORCE_COOLDOWN: 2200,
  FORCE_RANGE: 48,
  KEY_TIMER_MS: 45000,
  CYBORG_HP: 3,
  PLAYER_HP: 5,
  HIT_IFRAME_MS: 700,
  STORAGE_KEY: "elove-lab-escape-best",
  COLORS: {
    pink: "#ff7eb9",
    cyan: "#5ce1e6",
    purple: "#b388ff",
    gold: "#ffd166",
    cream: "#fff5fb",
    ink: "#2a1838",
    floor: "#e8d5f0",
    floorAlt: "#dcc4ea",
    wall: "#9b7bb8",
    wallDark: "#6e4f8a",
    pod: "#7ec8e8",
    danger: "#ff5c8a",
    ok: "#7dffb3",
  },
};

export const TILE = {
  EMPTY: 0,
  WALL: 1,
  FLOOR: 2,
  POD: 3,
  DOOR_LOCKED: 4,
  DOOR_OPEN: 5,
  CONSOLE: 6,
  CLOSET: 7,
  EXIT: 8,
  DECOR: 9,
  HIDDEN_BTN: 10,
};

/** Convert gameplay (pixel) coords → Three.js XZ floor plane */
export function toWorld(x, y) {
  return {
    x: (x / CFG.TILE) * CFG.UNIT,
    z: (y / CFG.TILE) * CFG.UNIT,
  };
}

export function tileToWorld(tx, ty) {
  return {
    x: (tx + 0.5) * CFG.UNIT,
    z: (ty + 0.5) * CFG.UNIT,
  };
}
