/* Level catalog - shared layout, distinct visual themes */

/** Flip to false to restore normal unlock progression. */
export const UNLOCK_ALL_FOR_TESTING = true;

export const LEVELS = [
  {
    id: 1,
    key: "canyon",
    name: "Ultra Earth",
    theme: "canyon",
    toast: "Ultra Earth run - clear the hostiles!",
    winToast: "Ultra Earth cleared!",
    storageBest: "elove-side-scroll-best",
    unlockKey: null,
  },
  {
    id: 2,
    key: "cake",
    name: "Cake Realm",
    theme: "cake",
    toast: "Cake Realm - frosting skies & hostiles!",
    winToast: "Cake Realm cleared!",
    storageBest: "elove-side-scroll-best-l2",
    unlockKey: "elove-level2-unlocked",
  },
  {
    id: 2.5,
    key: "boring",
    name: "Boring Company",
    theme: "boring",
    toast: "Boring Company - tunnel run!",
    winToast: "Boring Company cleared!",
    storageBest: "elove-side-scroll-best-l25",
    unlockKey: "elove-level25-unlocked",
  },
  {
    // Numeric id 2.55; UI / ?level= label is "2.5.5"
    id: 2.55,
    key: "neuralink",
    name: "Neuralink",
    theme: "neuralink",
    toast: "Neuralink - OR link-up!",
    winToast: "Neuralink cleared!",
    storageBest: "elove-side-scroll-best-l255",
    unlockKey: "elove-level255-unlocked",
  },
  {
    id: 3,
    key: "tesla",
    name: "Tesla Works",
    theme: "tesla",
    toast: "Tesla Works - getting closer to finding Elove!",
    winToast: "Tesla Works cleared - Elove is near!",
    storageBest: "elove-side-scroll-best-l3",
    unlockKey: "elove-level3-unlocked",
  },
  {
    id: 4,
    key: "spacex",
    name: "SpaceX Ascent",
    theme: "spacex",
    toast: "SpaceX Ascent - closer to Elove!",
    winToast: "SpaceX Ascent cleared - so close to Elove!",
    storageBest: "elove-side-scroll-best-l4",
    unlockKey: "elove-level4-unlocked",
  },
  {
    // Numeric id 4.5; UI / ?level= label is "4.5"
    id: 4.5,
    key: "moon",
    name: "Moon Bouncing",
    theme: "moon",
    toast: "Moon Bouncing - low-g hops to the Starship!",
    winToast: "Moon Bouncing cleared - snug with Elove!",
    storageBest: "elove-side-scroll-best-l45",
    unlockKey: "elove-level45-unlocked",
  },
  {
    id: 5,
    key: "starship",
    name: "Inside Starship",
    theme: "starship",
    toast: "Inside Starship - Elove waits at the controls!",
    winToast: "Mars movie - vacation - Elove saved you!",
    storageBest: "elove-side-scroll-best-l5",
    unlockKey: "elove-level5-unlocked",
  },
];

/** Baseline side-scroller physics (restored when leaving Moon Bouncing). */
export const BASE_PHYSICS = {
  GRAVITY: 0.28,
  JUMP_VY: -6.0,
  BOUNCE_VY: -7.4,
  MAX_FALL: 6.5,
};

/** Level-only physics overrides (applied to CFG while that level runs). */
export function getLevelPhysics(id) {
  if (id === 4.5) {
    return {
      GRAVITY: 0.14,
      JUMP_VY: -7.5,
      BOUNCE_VY: -9.0,
      MAX_FALL: 4.0,
    };
  }
  return null;
}

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}

/** ?debug=1 or localStorage elove-debug=1 — unlock-all / Cake default boot. */
export function isDebugMode(searchParams) {
  try {
    const q = searchParams ?? new URLSearchParams(location.search);
    if (q.get("debug") === "1") return true;
    if (localStorage.getItem("elove-debug") === "1") return true;
  } catch (_) {}
  return false;
}

export function unlockAllLevels() {
  for (const lvl of LEVELS) {
    if (!lvl.unlockKey) continue;
    try {
      localStorage.setItem(lvl.unlockKey, "1");
    } catch (_) {}
  }
}

export function isLevelUnlocked(id) {
  const lvl = getLevel(id);
  if (!lvl.unlockKey) return true;
  if (UNLOCK_ALL_FOR_TESTING || isDebugMode()) return true;
  try {
    return localStorage.getItem(lvl.unlockKey) === "1";
  } catch (_) {
    return false;
  }
}

export function unlockLevel(id) {
  const lvl = getLevel(id);
  if (!lvl?.unlockKey) return;
  try {
    localStorage.setItem(lvl.unlockKey, "1");
  } catch (_) {}
}
