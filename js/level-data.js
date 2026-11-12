/* Per-level enemy/loot spawn tables + win progression ladder (data only). */

/** Cake Realm candy art variants (cycled by spawn order in buildLoot). */
export const CANDY_KINDS = [
  "lollipop",
  "candy-cane",
  "gumdrop",
  "wrapped-chocolate",
  "jelly-bean",
  "hard",
];

/** Shared Elove clue row (L1 + Boring Company). */
const CLUE_ROW = [
  { type: "clue", x: 8, yTile: 10 },
  { type: "clue", x: 16, yTile: 8 },
  { type: "clue", x: 25, yTile: 9 },
  { type: "clue", x: 32, yTile: 7 },
  { type: "clue", x: 40, yTile: 9 },
  { type: "clue", x: 48, yTile: 6 },
  { type: "clue", x: 57, yTile: 8 },
  { type: "clue", x: 66, yTile: 7 },
  { type: "clue", x: 74, yTile: 9 },
  { type: "clue", x: 82, yTile: 8 },
];

/**
 * Enemy cast per level (counts + kinds preserved).
 * Entry: [kind, xTiles, yMode, yArg?] — trailing fields are legacy layout hints only;
 * game.js randomizes positions onto World.walkPads() each spawnRun.
 * yMode hint: "floor" | "plat" | "air" (drones always use air rules).
 */
export const LEVEL_ENEMY_SPAWNS = {
  1: [
    ["cyborg", 18, "floor"],
    ["cyborg", 36, "floor"],
    ["cyborg", 55, "floor"],
    ["cyborg", 78, "floor"],
    ["drone", 20, "air", 5],
    ["drone", 40, "air", 4],
    ["drone", 60, "air", 5],
    ["drone", 74, "air", 4.5],
  ],
  2: [
    ["cyborg", 8, "plat", 10],
    ["cyborg", 24, "plat", 9],
    ["cyborg", 48, "plat", 6],
    ["cyborg", 66, "plat", 7],
    ["optimus", 40, "plat", 9],
    ["optimus", 82, "plat", 8],
    ["drone", 16, "air", 6],
    ["drone", 32, "air", 3.5],
    ["drone", 56, "air", 4.5],
    ["drone", 76, "air", 5.5],
  ],
  2.5: [
    ["cyborg", 10, "plat", 10],
    ["cyborg", 28, "plat", 8],
    ["cyborg", 50, "plat", 9],
    ["cyborg", 72, "plat", 7],
    ["optimus", 38, "plat", 9],
    ["optimus", 80, "plat", 8],
    ["drone", 14, "air", 5],
    ["drone", 36, "air", 3.5],
    ["drone", 54, "air", 4.5],
    ["drone", 78, "air", 5.5],
  ],
  2.55: [
    ["cyborg", 12, "plat", 10],
    ["cyborg", 30, "plat", 8],
    ["cyborg", 52, "plat", 9],
    ["cyborg", 70, "plat", 7],
    ["optimus", 36, "plat", 9],
    ["optimus", 78, "plat", 8],
    ["drone", 15, "air", 5],
    ["drone", 38, "air", 3.5],
    ["drone", 56, "air", 4.5],
    ["drone", 76, "air", 5.5],
  ],
  3: [
    ["cyborg", 16, "plat", 8],
    ["cyborg", 42, "plat", 9],
    ["cyborg", 58, "plat", 8],
    ["cyborg", 74, "plat", 9],
    ["optimus", 26, "plat", 9],
    ["optimus", 68, "plat", 7],
    ["drone", 12, "air", 4],
    ["drone", 34, "air", 5.5],
    ["drone", 50, "air", 3],
    ["drone", 80, "air", 4.5],
  ],
  4: [
    ["cyborg", 12, "plat", 9],
    ["cyborg", 36, "plat", 8],
    ["cyborg", 52, "plat", 9],
    ["cyborg", 70, "plat", 6],
    ["optimus", 22, "plat", 8],
    ["optimus", 62, "plat", 9],
    ["drone", 18, "air", 5],
    ["drone", 40, "air", 3.5],
    ["drone", 58, "air", 5.5],
    ["drone", 78, "air", 4],
  ],
  4.5: [
    ["cyborg", 14, "plat", 10],
    ["cyborg", 34, "plat", 8],
    ["cyborg", 54, "plat", 9],
    ["cyborg", 72, "plat", 7],
    ["optimus", 24, "plat", 9],
    ["optimus", 64, "plat", 8],
    ["drone", 16, "air", 5],
    ["drone", 42, "air", 3.5],
    ["drone", 60, "air", 4.5],
    ["drone", 80, "air", 5.5],
  ],
  5: [
    ["cyborg", 20, "plat", 10],
    ["cyborg", 48, "plat", 8],
    ["drone", 34, "air", 4.5],
    ["drone", 66, "air", 5],
  ],
};

/** Shared base pickups (all levels). Coords in tiles; y = yTile * TILE - 6. */
export const BASE_LOOT = [
  { type: "heart", x: 22, yTile: 9 },
  { type: "shield", x: 46, yTile: 7 },
  { type: "battery", x: 64, yTile: 8 },
  { type: "magnet", x: 34, yTile: 8 },
  { type: "gun-pistol", x: 28, yTile: 8 },
  { type: "gun-blaster", x: 50, yTile: 7 },
];

/** Extra themed collectibles per level (tile coords). */
export const LEVEL_EXTRA_LOOT = {
  1: CLUE_ROW,
  2.5: CLUE_ROW,
  2.55: [
    { type: "clue", x: 8, yTile: 10 },
    { type: "neuralink-device", x: 12, yTile: 10 },
    { type: "clue", x: 16, yTile: 8 },
    { type: "neuralink-device", x: 20, yTile: 8 },
    { type: "clue", x: 25, yTile: 9 },
    { type: "neuralink-device", x: 29, yTile: 9 },
    { type: "clue", x: 32, yTile: 7 },
    { type: "neuralink-device", x: 36, yTile: 7 },
    { type: "clue", x: 40, yTile: 9 },
    { type: "neuralink-device", x: 44, yTile: 9 },
    { type: "clue", x: 48, yTile: 6 },
    { type: "neuralink-device", x: 52, yTile: 6 },
    { type: "clue", x: 57, yTile: 8 },
    { type: "neuralink-device", x: 61, yTile: 8 },
    { type: "clue", x: 66, yTile: 7 },
    { type: "neuralink-device", x: 70, yTile: 7 },
    { type: "clue", x: 74, yTile: 9 },
    { type: "neuralink-device", x: 78, yTile: 9 },
    { type: "clue", x: 82, yTile: 8 },
    { type: "neuralink-device", x: 85, yTile: 8 },
  ],
  2: [
    { type: "clue", x: 8, yTile: 10 },
    { type: "candy", x: 12, yTile: 10 },
    { type: "clue", x: 16, yTile: 8 },
    { type: "candy", x: 20, yTile: 8 },
    { type: "clue", x: 25, yTile: 9 },
    { type: "candy", x: 29, yTile: 9 },
    { type: "clue", x: 32, yTile: 7 },
    { type: "candy", x: 36, yTile: 7 },
    { type: "clue", x: 40, yTile: 9 },
    { type: "candy", x: 44, yTile: 9 },
    { type: "clue", x: 48, yTile: 6 },
    { type: "candy", x: 52, yTile: 6 },
    { type: "clue", x: 57, yTile: 8 },
    { type: "candy", x: 61, yTile: 8 },
    { type: "clue", x: 66, yTile: 7 },
    { type: "candy", x: 70, yTile: 7 },
    { type: "clue", x: 74, yTile: 9 },
    { type: "candy", x: 78, yTile: 9 },
    { type: "clue", x: 82, yTile: 8 },
    { type: "candy", x: 85, yTile: 8 },
  ],
  3: [
    { type: "clue", x: 8, yTile: 10 },
    { type: "gear", x: 12, yTile: 10 },
    { type: "engineering", x: 16, yTile: 8 },
    { type: "helper-droid", x: 20, yTile: 8 },
    { type: "clue", x: 25, yTile: 9 },
    { type: "gear", x: 29, yTile: 9 },
    { type: "engineering", x: 32, yTile: 7 },
    { type: "helper-droid", x: 36, yTile: 7 },
    { type: "clue", x: 40, yTile: 9 },
    { type: "gear", x: 44, yTile: 9 },
    { type: "engineering", x: 48, yTile: 6 },
    { type: "helper-droid", x: 52, yTile: 6 },
    { type: "clue", x: 57, yTile: 8 },
    { type: "gear", x: 61, yTile: 8 },
    { type: "clue", x: 66, yTile: 7 },
    { type: "engineering", x: 70, yTile: 7 },
    { type: "helper-droid", x: 74, yTile: 9 },
    { type: "gear", x: 82, yTile: 8 },
  ],
  4: null, // filled below with shared space row
  4.5: null,
  5: null,
};

const SPACE_ROW = [
  { type: "clue", x: 8, yTile: 10 },
  { type: "starship-tile", x: 12, yTile: 10 },
  { type: "moon-rock", x: 16, yTile: 8 },
  { type: "mars-rock", x: 20, yTile: 8 },
  { type: "clue", x: 25, yTile: 9 },
  { type: "starship-tile", x: 29, yTile: 9 },
  { type: "moon-rock", x: 32, yTile: 7 },
  { type: "mars-rock", x: 36, yTile: 7 },
  { type: "clue", x: 40, yTile: 9 },
  { type: "starship-tile", x: 44, yTile: 9 },
  { type: "moon-rock", x: 48, yTile: 6 },
  { type: "mars-rock", x: 52, yTile: 6 },
  { type: "clue", x: 57, yTile: 8 },
  { type: "starship-tile", x: 61, yTile: 8 },
  { type: "moon-rock", x: 66, yTile: 7 },
  { type: "mars-rock", x: 70, yTile: 7 },
  { type: "clue", x: 74, yTile: 9 },
  { type: "starship-tile", x: 82, yTile: 8 },
];
LEVEL_EXTRA_LOOT[4] = SPACE_ROW;
LEVEL_EXTRA_LOOT[4.5] = SPACE_ROW;
LEVEL_EXTRA_LOOT[5] = SPACE_ROW;

/**
 * Win ladder: clear `from` → unlock `unlock`, toast names for Enter advance.
 * Final level (5) has unlock: null (cinematic path in game.js).
 */
export const LEVEL_PROGRESSION = [
  { from: 1, unlock: 2, nextName: "Cake Realm", enterLabel: "Level 2" },
  { from: 2, unlock: 2.5, nextName: "Boring Company", enterLabel: "Level 2.5" },
  { from: 2.5, unlock: 2.55, nextName: "Neuralink", enterLabel: "Level 2.5.5" },
  { from: 2.55, unlock: 3, nextName: "Tesla Works", enterLabel: "Level 3" },
  { from: 3, unlock: 4, nextName: "SpaceX Ascent", enterLabel: "Level 4" },
  { from: 4, unlock: 4.5, nextName: "Moon Bouncing", enterLabel: "Level 4.5" },
  { from: 4.5, unlock: 5, nextName: "Inside Starship", enterLabel: "Level 5" },
  { from: 5, unlock: null, nextName: null, enterLabel: null },
];

export function getProgression(levelId) {
  return LEVEL_PROGRESSION.find((p) => p.from === levelId) || null;
}
