/* ELOVE GAME — side-scroller config */
export const CFG = {
  /** Native game resolution (framebuffer). CSS upscales with nearest-neighbor. */
  INTERNAL_W: 480,
  INTERNAL_H: 270,
  TILE: 16,
  /** World units per framebuffer pixel. */
  VIEW_SCALE: 1,
  PLAYER_SPEED: 1.55,
  JUMP_VY: -5.2,
  GRAVITY: 0.28,
  MAX_FALL: 6.5,
  SLASH_RANGE: 48,
  SLASH_COOLDOWN: 320,
  SLASH_DURATION: 240,
  FORCE_COOLDOWN: 2200,
  FORCE_RANGE: 56,
  CYBORG_HP: 3,
  DRONE_HP: 2,
  PLAYER_HP: 5,
  HIT_IFRAME_MS: 700,
  STORAGE_KEY: "elove-side-scroll-best",
  COLORS: {
    pink: "#ff2ea6",
    cyan: "#00e8ff",
    purple: "#b388ff",
    gold: "#ffe066",
    cream: "#fff5fb",
    ink: "#1a0a2e",
    floor: "#1a1438",
    floorAlt: "#221850",
    wall: "#2a1850",
    wallDark: "#140c28",
    pod: "#7ec8e8",
    danger: "#ff5c8a",
    ok: "#7dffb3",
    skyTop: "#1a0a2e",
    skyBot: "#ffc050",
    neonPink: "#ff2ea6",
    neonCyan: "#00e8ff",
  },
};

export const TILE = {
  EMPTY: 0,
  SOLID: 1,
  PLATFORM: 2, // one-way / thin platform (solid from above)
  EXIT: 3,
  SPAWN: 4,
};
