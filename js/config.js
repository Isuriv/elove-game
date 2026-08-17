/* ELOVE GAME - side-scroller config */

/** Bump when shipping runtime JS changes (keep in sync with index.html / import ?v=). */
export const BUILD = "rainbow-bolts-20260816b";

export const CFG = {
  /**
   * Native pixel-art framebuffer (16:9). Nearest-neighbor CSS integer upscale.
   * 480x270 -> x2=960x540, x3=1440x810. Cap at x3 so HD x4 (1920x1080) does not
   * dominate the viewport or look overly chunky; chrome sits around the canvas.
   */
  INTERNAL_W: 480,
  INTERNAL_H: 270,
  /** Physics baseline frame duration (ms). Scale impulses by dt / FRAME_MS. */
  FRAME_MS: 1000 / 60,
  /** Jump pressed early: consume within this window after bufferJump(now). */
  JUMP_BUFFER_MS: 125,
  /** Brief grace after leaving a platform where jump still works. */
  COYOTE_MS: 65,
  /** Preferred CSS display size (x3). Fallback x2 when chrome cannot fit. */
  DISPLAY_TARGET_W: 1440,
  DISPLAY_TARGET_H: 810,
  /** Largest integer CSS scale (x4 HD is too chunky and crowds chrome). */
  DISPLAY_MAX_SCALE: 3,
  TILE: 16,
  /** World units per framebuffer pixel (keep 1 so art/world stay locked). */
  VIEW_SCALE: 1,
  PLAYER_SPEED: 1.55,
  /**
   * Mario-style mid-air steering: full horizontal control while airborne.
   * 1 = same top speed as ground; air accel lerps toward input each frame.
   */
  AIR_CONTROL: 1,
  AIR_ACCEL: 0.55,
  /** Light coast when no left/right input in air (momentum carry). */
  AIR_FRICTION: 0.96,
  /**
   * Mario-like jump tuned to level spacing (g=0.28, speed=1.55):
   * clears adjacent pads up to +3 tiles / 64px gaps; apex ~4.2 tiles.
   */
  JUMP_VY: -6.0,
  /** Launch velocity when landing on bounce pads. */
  BOUNCE_VY: -7.4,
  /** Slippery pad: acceleration toward input / coast friction. */
  SLIP_ACCEL: 0.045,
  SLIP_FRICTION: 0.9985,
  SLIP_MAX_SPEED: 3.15,
  GRAVITY: 0.28,
  MAX_FALL: 6.5,
  SLASH_RANGE: 62,
  SLASH_COOLDOWN: 320,
  SLASH_DURATION: 240,
  FORCE_COOLDOWN: 2200,
  FORCE_RANGE: 56,
  /** Pink gun pickup: auto-fire rainbow drone-style bolts (not a laser). */
  GUN_FIRE_MS: 3000,
  GUN_FIRE_INTERVAL: 100,
  GUN_BULLET_SPEED: 5.2,
  GUN_BULLET_RANGE: 220,
  /** Extra pink guns on the first gun pickup of a run (scattered loot has noScatter). */
  GUN_SCATTER_COUNT: 10,
  RAINBOW_BULLET_COLORS: [
    "#ff004d",
    "#ff5a00",
    "#ffd400",
    "#5cff00",
    "#00ff9a",
    "#00eaff",
    "#2f6bff",
    "#8a1cff",
    "#ff00ea",
    "#ff4da6",
  ],
  /** L3 mini helper droid - slow friendly bolts at nearest foe. */
  HELPER_FIRE_INTERVAL: 720,
  HELPER_BULLET_SPEED: 2.4,
  HELPER_BULLET_RANGE: 170,
  HELPER_ACQUIRE_RANGE: 150,
  /** Drone bolts - deliberately slow vs player gun (5.2). */
  DRONE_BULLET_SPEED: 1.35,
  DRONE_BULLET_RANGE: 200,
  DRONE_FIRE_RANGE: 220,
  DRONE_FIRE_INTERVAL: 1300,
  CYBORG_HP: 3,
  DRONE_HP: 2,
  /** Tesla Optimus - slightly tankier ground foe. */
  OPTIMUS_HP: 4,
  /** Level 3 Tesla car-droid boss - high HP end fight. */
  CARBOT_HP: 12,
  CARBOT_RAM_RANGE: 48,
  CARBOT_RAM_DAMAGE: 2,
  CARBOT_FIRE_RANGE: 260,
  CARBOT_FIRE_INTERVAL: 1600,
  CARBOT_BULLET_SPEED: 1.55,
  /** Level 4 SpaceX rocket boss - high HP end fight. */
  ROCKET_HP: 12,
  ROCKET_RAM_RANGE: 48,
  ROCKET_RAM_DAMAGE: 2,
  ROCKET_FIRE_RANGE: 260,
  ROCKET_FIRE_INTERVAL: 1600,
  ROCKET_BULLET_SPEED: 1.55,
  PLAYER_HP: 5,
  HIT_IFRAME_MS: 700,
  STORAGE_KEY: "elove-side-scroll-best",
  /**
   * Neon-pastel Mars Love palette - analogous pink->lavender with cyan contrast
   * and warm gold/sunset accents. Mid-tones preferred over near-black fills.
   */
  COLORS: {
    pink: "#ff2ea6",
    pinkSoft: "#ff6ec7",
    cyan: "#00e8ff",
    cyanSoft: "#7df9ff",
    purple: "#b388ff",
    purpleLight: "#d6b6ff",
    gold: "#ffe066",
    cream: "#fff5fb",
    ink: "#3a2458",
    floor: "#5a4498",
    floorAlt: "#6a54a8",
    wall: "#7a62b0",
    wallDark: "#5a4490",
    pod: "#7ec8e8",
    danger: "#ff5c8a",
    ok: "#7dffb3",
    skyTop: "#6b3d9e",
    skyMid: "#e050b8",
    skyBot: "#ffd078",
    sunset: "#ffc050",
    neonPink: "#ff2ea6",
    neonCyan: "#00e8ff",
  },
};

export const TILE = {
  EMPTY: 0,
  SOLID: 1,
  PLATFORM: 2, // one-way grip pad (lilac body + purple neon tread)
  EXIT: 3,
  SPAWN: 4,
  /**
   * Art/render bake only — not placed in the playable solid-floor map, so there is
   * no contact damage path. Neon tiles may still draw TOXIC for gallery/legacy.
   */
  TOXIC: 5,
  /** Cyan ice glass - low friction / slides. */
  PLAT_SLIP: 6,
  /** Gold launch deck + pink rim - launches upward on land. */
  PLAT_BOUNCE: 7,
};

/** Thin walkable platform tiles (one-way from above). */
export function isPlatformTile(t) {
  return t === TILE.PLATFORM || t === TILE.PLAT_SLIP || t === TILE.PLAT_BOUNCE;
}

/** Scale per-frame physics toward a 60fps baseline (dt in ms). */
export function frameScale(dt) {
  const base = CFG.FRAME_MS || 1000 / 60;
  return (dt > 0 ? dt : base) / base;
}
