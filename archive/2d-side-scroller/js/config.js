/* ELOVE GAME — side-scroller config */
export const CFG = {
  /** Native game resolution (framebuffer). CSS upscales smoothly. */
  INTERNAL_W: 960,
  INTERNAL_H: 540,
  TILE: 16,
  /** World units × this = framebuffer pixels. */
  VIEW_SCALE: 2,
  PLAYER_SPEED: 1.55,
  JUMP_VY: -5.2,
  /** Early jump release cuts upward speed (short hop). */
  JUMP_CUT: 0.45,
  GRAVITY: 0.28,
  MAX_FALL: 6.5,
  /** Grace ms after walking off a ledge where jump still works. */
  COYOTE_MS: 110,
  /** How long a mid-air jump press is remembered. */
  JUMP_BUFFER_MS: 140,
  SLASH_RANGE: 26,
  SLASH_COOLDOWN: 280,
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
