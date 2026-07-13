/* ELOVE GAME — shared config & palette (2D HD pixel) */
export const CFG = {
  TILE: 16, // logical units (collision / gameplay coords)
  VIEW_SCALE: 3, // canvas pixels per logical unit — HD pixel look
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
  // Cute furniture (solid unless noted)
  BEANBAG: 11,
  CHAIR: 12,
  PLANT: 13,
  FRIDGE: 14,
  LAMP: 15,
  PLUSH: 16,
  TABLE: 17,
  RUG: 18, // walkable soft prop
  SHELF: 19,
};
